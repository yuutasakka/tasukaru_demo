/**
 * フォールバックメカニズムとサーキットブレーカー実装
 */

import { EventEmitter } from 'events';

/**
 * サーキットブレーカーの状態
 */
export enum CircuitState {
  CLOSED = 'CLOSED',      // 正常動作
  OPEN = 'OPEN',          // 回路遮断中
  HALF_OPEN = 'HALF_OPEN' // 回復試行中
}

/**
 * サーキットブレーカー設定
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;      // 失敗回数の閾値
  resetTimeout: number;          // リセットまでの時間（ミリ秒）
  monitoringPeriod: number;      // 監視期間（ミリ秒）
  volumeThreshold: number;       // 最小リクエスト数
  errorThresholdPercentage: number; // エラー率の閾値（%）
}

/**
 * サーキットブレーカー実装
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private requestCounts: { timestamp: number; success: boolean }[] = [];

  constructor(private options: CircuitBreakerOptions) {
    super();
  }

  /**
   * 保護された関数の実行
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // 回路が開いている場合
    if (this.state === CircuitState.OPEN) {
      this.emit('rejected', { state: this.state });
      
      if (fallback) {
        return fallback();
      }
      
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      
      if (fallback && this.state === CircuitState.OPEN) {
        return fallback();
      }
      
      throw error;
    }
  }

  /**
   * 成功時の処理
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.recordRequest(true);

    if (this.state === CircuitState.HALF_OPEN) {
      this.close();
    }

    this.emit('success', { state: this.state });
  }

  /**
   * 失敗時の処理
   */
  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recordRequest(false);

    this.emit('failure', { 
      state: this.state, 
      failureCount: this.failureCount,
      error 
    });

    // エラー率チェック
    const errorRate = this.calculateErrorRate();
    const totalRequests = this.getRecentRequestCount();

    if (
      totalRequests >= this.options.volumeThreshold &&
      (this.failureCount >= this.options.failureThreshold ||
       errorRate >= this.options.errorThresholdPercentage)
    ) {
      this.open();
    }
  }

  /**
   * 回路を開く
   */
  private open(): void {
    if (this.state === CircuitState.OPEN) return;

    this.state = CircuitState.OPEN;
    this.emit('open', { 
      failureCount: this.failureCount,
      errorRate: this.calculateErrorRate() 
    });

    // リセットタイマーの設定
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.options.resetTimeout);
  }

  /**
   * 回路を半開状態にする
   */
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.failureCount = 0;
    this.successCount = 0;
    this.emit('halfOpen');
  }

  /**
   * 回路を閉じる
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.emit('close');

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * リクエストの記録
   */
  private recordRequest(success: boolean): void {
    const now = Date.now();
    this.requestCounts.push({ timestamp: now, success });

    // 古いレコードを削除
    const cutoff = now - this.options.monitoringPeriod;
    this.requestCounts = this.requestCounts.filter(
      record => record.timestamp > cutoff
    );
  }

  /**
   * エラー率の計算
   */
  private calculateErrorRate(): number {
    if (this.requestCounts.length === 0) return 0;

    const failures = this.requestCounts.filter(r => !r.success).length;
    return (failures / this.requestCounts.length) * 100;
  }

  /**
   * 最近のリクエスト数を取得
   */
  private getRecentRequestCount(): number {
    return this.requestCounts.length;
  }

  /**
   * 現在の状態を取得
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      errorRate: this.calculateErrorRate(),
      totalRequests: this.getRecentRequestCount()
    };
  }
}

/**
 * レート制限フォールバックシステム
 */
export class RateLimitFallbackSystem {
  private primaryCircuit: CircuitBreaker;
  private fallbackStrategies: Map<string, () => Promise<boolean>> = new Map();

  constructor() {
    this.primaryCircuit = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30秒
      monitoringPeriod: 60000, // 1分
      volumeThreshold: 10,
      errorThresholdPercentage: 50
    });

    this.initializeFallbackStrategies();
  }

  /**
   * フォールバック戦略の初期化
   */
  private initializeFallbackStrategies(): void {
    // インメモリカウンター
    this.fallbackStrategies.set('memory', async () => {
      return this.inMemoryRateLimitCheck();
    });

    // Redisキャッシュ
    this.fallbackStrategies.set('redis', async () => {
      return this.redisRateLimitCheck();
    });

    // 固定レート制限
    this.fallbackStrategies.set('fixed', async () => {
      return this.fixedRateLimitCheck();
    });
  }

  /**
   * レート制限チェック（フォールバック付き）
   */
  async checkRateLimit(
    identifier: string,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number; strategy: string }> {
    try {
      // プライマリチェック（データベース）
      const result = await this.primaryCircuit.execute(
        async () => this.databaseRateLimitCheck(identifier, limit),
        async () => this.executeFallbackChain(identifier, limit)
      );

      return result;
    } catch (error) {
      console.error('All rate limit strategies failed:', error);
      
      // 最終フォールバック：保守的な固定レート
      return {
        allowed: false,
        remaining: 0,
        strategy: 'emergency'
      };
    }
  }

  /**
   * データベースベースのレート制限チェック
   */
  private async databaseRateLimitCheck(
    identifier: string,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number; strategy: string }> {
    // Supabaseまたは他のデータベースでのチェック
    // 実装は省略
    throw new Error('Database rate limit check not implemented');
  }

  /**
   * フォールバックチェーンの実行
   */
  private async executeFallbackChain(
    identifier: string,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number; strategy: string }> {
    const strategies = ['memory', 'redis', 'fixed'];

    for (const strategy of strategies) {
      try {
        const fallbackFn = this.fallbackStrategies.get(strategy);
        if (fallbackFn) {
          const allowed = await fallbackFn();
          return {
            allowed,
            remaining: allowed ? limit - 1 : 0,
            strategy
          };
        }
      } catch (error) {
        console.warn(`Fallback strategy ${strategy} failed:`, error);
        continue;
      }
    }

    throw new Error('All fallback strategies failed');
  }

  /**
   * インメモリレート制限チェック
   */
  private inMemoryRateLimitCheck(): boolean {
    // 簡単なインメモリ実装
    // 本番環境では分散環境対応が必要
    return Math.random() > 0.5; // デモ用
  }

  /**
   * Redisベースのレート制限チェック
   */
  private async redisRateLimitCheck(): Promise<boolean> {
    // Redis実装
    throw new Error('Redis not available');
  }

  /**
   * 固定レート制限チェック
   */
  private fixedRateLimitCheck(): boolean {
    // 保守的な固定レート（1分に1回など）
    return false;
  }
}

/**
 * 依存サービスの健全性チェック
 */
export class DependencyHealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private checkInterval: number = 30000; // 30秒
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * ヘルスチェックの登録
   */
  registerCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
    this.startHealthCheck(name);
  }

  /**
   * ヘルスチェックの開始
   */
  private startHealthCheck(name: string): void {
    const checkFn = this.checks.get(name);
    if (!checkFn) return;

    const performCheck = async () => {
      try {
        const isHealthy = await checkFn();
        this.healthStatus.set(name, isHealthy);
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error);
        this.healthStatus.set(name, false);
      }
    };

    // 初回チェック
    performCheck();

    // 定期チェック
    const timer = setInterval(performCheck, this.checkInterval);
    this.timers.set(name, timer);
  }

  /**
   * サービスの健全性を取得
   */
  isHealthy(name: string): boolean {
    return this.healthStatus.get(name) || false;
  }

  /**
   * 全サービスの健全性状態を取得
   */
  getAllHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.healthStatus.forEach((value, key) => {
      status[key] = value;
    });
    return status;
  }

  /**
   * ヘルスチェックの停止
   */
  stopHealthCheck(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
    }
    this.checks.delete(name);
    this.healthStatus.delete(name);
  }
}

/**
 * グレースフルデグレード管理
 */
export class GracefulDegradation {
  private features: Map<string, boolean> = new Map();
  private degradationLevels: Map<string, number> = new Map();

  /**
   * 機能の登録
   */
  registerFeature(
    name: string,
    degradationLevel: number = 0,
    enabled: boolean = true
  ): void {
    this.features.set(name, enabled);
    this.degradationLevels.set(name, degradationLevel);
  }

  /**
   * デグレードレベルの設定
   */
  setDegradationLevel(level: number): void {
    this.features.forEach((_, feature) => {
      const featureLevel = this.degradationLevels.get(feature) || 0;
      this.features.set(feature, featureLevel <= level);
    });
  }

  /**
   * 機能が有効かチェック
   */
  isFeatureEnabled(name: string): boolean {
    return this.features.get(name) || false;
  }

  /**
   * 現在の状態を取得
   */
  getCurrentState(): Record<string, boolean> {
    const state: Record<string, boolean> = {};
    this.features.forEach((value, key) => {
      state[key] = value;
    });
    return state;
  }
}