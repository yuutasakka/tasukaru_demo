import { supabase } from '../components/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface RealtimeMetrics {
  activeDiagnoses: number;
  completedDiagnoses: number;
  activeUsers: number;
  smsVerifications: number;
  errorCount: number;
  lastUpdated: Date;
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

/**
 * リアルタイムイベント処理とダッシュボード統計管理サービス
 */
class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventBuffer: RealtimeEvent[] = [];
  private metrics: RealtimeMetrics = {
    activeDiagnoses: 0,
    completedDiagnoses: 0,
    activeUsers: 0,
    smsVerifications: 0,
    errorCount: 0,
    lastUpdated: new Date()
  };
  private alerts: SystemAlert[] = [];
  private subscribers: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initializeEventBuffer();
  }

  /**
   * イベントバッファの初期化
   */
  private initializeEventBuffer() {
    // 5分間のイベント履歴を保持
    setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      this.eventBuffer = this.eventBuffer.filter(event => event.timestamp > fiveMinutesAgo);
    }, 60000); // 1分ごとにクリーンアップ
  }

  /**
   * リアルタイムチャネルの作成と管理
   */
  createChannel(channelName: string): RealtimeChannel {
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: channelName }
      }
    });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 診断セッションイベントの監視
   */
  subscribeToDiagnosisEvents(callback: (event: RealtimeEvent) => void) {
    const channel = this.createChannel('diagnosis-events');

    // 新規診断開始
    channel.on('postgres_changes' as any, {
      event: 'INSERT',
      schema: 'public',
      table: 'diagnosis_sessions'
    }, (payload: any) => {
      const event: RealtimeEvent = {
        id: `diag-start-${payload.new.id}`,
        type: 'DIAGNOSIS_STARTED',
        data: payload.new,
        timestamp: new Date(),
        sessionId: payload.new.session_id
      };
      
      this.handleEvent(event, callback);
      this.updateMetrics('activeDiagnoses', 1);
    });

    // 診断完了
    channel.on('postgres_changes' as any, {
      event: 'UPDATE',
      schema: 'public',
      table: 'diagnosis_sessions',
      filter: 'status=eq.completed'
    }, (payload: any) => {
      const event: RealtimeEvent = {
        id: `diag-complete-${payload.new.id}`,
        type: 'DIAGNOSIS_COMPLETED',
        data: payload.new,
        timestamp: new Date(),
        sessionId: payload.new.session_id
      };
      
      this.handleEvent(event, callback);
      this.updateMetrics('completedDiagnoses', 1);
      this.updateMetrics('activeDiagnoses', -1);
    });

    // SMS認証完了
    channel.on('postgres_changes' as any, {
      event: 'UPDATE',
      schema: 'public',
      table: 'diagnosis_sessions',
      filter: 'phone_verified=eq.true'
    }, (payload: any) => {
      const event: RealtimeEvent = {
        id: `sms-verified-${payload.new.id}`,
        type: 'SMS_VERIFIED',
        data: payload.new,
        timestamp: new Date(),
        sessionId: payload.new.session_id
      };
      
      this.handleEvent(event, callback);
      this.updateMetrics('smsVerifications', 1);
    });

    channel.subscribe();
    return channel;
  }

  /**
   * 管理者アクティビティの監視
   */
  subscribeToAdminActivity(callback: (event: RealtimeEvent) => void) {
    const channel = this.createChannel('admin-activity');

    // 承認申請
    channel.on('postgres_changes' as any, {
      event: 'INSERT',
      schema: 'public',
      table: 'registration_requests'
    }, (payload: any) => {
      const event: RealtimeEvent = {
        id: `approval-request-${payload.new.id}`,
        type: 'APPROVAL_REQUEST_CREATED',
        data: payload.new,
        timestamp: new Date(),
        userId: payload.new.user_id
      };
      
      this.handleEvent(event, callback);
      this.createAlert({
        severity: 'info',
        message: '新しい承認申請が作成されました',
        metadata: { requestId: payload.new.id }
      });
    });

    // 管理者ログイン
    channel.on('postgres_changes' as any, {
      event: 'INSERT',
      schema: 'public',
      table: 'admin_sessions'
    }, (payload: any) => {
      const event: RealtimeEvent = {
        id: `admin-login-${payload.new.id}`,
        type: 'ADMIN_LOGIN',
        data: payload.new,
        timestamp: new Date(),
        userId: payload.new.admin_id
      };
      
      this.handleEvent(event, callback);
    });

    channel.subscribe();
    return channel;
  }

  /**
   * システムエラーの監視
   */
  subscribeToSystemErrors(callback: (alert: SystemAlert) => void) {
    const channel = this.createChannel('system-errors');

    // エラーログの監視（仮想的なテーブル）
    channel.on('postgres_changes' as any, {
      event: 'INSERT',
      schema: 'public',
      table: 'error_logs'
    }, (payload: any) => {
      const alert = this.createAlert({
        severity: payload.new.severity || 'error',
        message: payload.new.message,
        metadata: payload.new
      });
      
      callback(alert);
      this.updateMetrics('errorCount', 1);
    });

    channel.subscribe();
    return channel;
  }

  /**
   * イベント処理の共通ロジック
   */
  private handleEvent(event: RealtimeEvent, callback: (event: RealtimeEvent) => void) {
    // イベントをバッファに保存
    this.eventBuffer.push(event);
    
    // メトリクスの更新タイムスタンプを更新
    this.metrics.lastUpdated = new Date();
    
    // コールバック実行
    callback(event);
    
    // 購読者に通知
    this.notifySubscribers('event', event);
  }

  /**
   * メトリクスの更新
   */
  private updateMetrics(key: keyof RealtimeMetrics, delta: number) {
    if (typeof this.metrics[key] === 'number') {
      (this.metrics[key] as number) = Math.max(0, (this.metrics[key] as number) + delta);
      this.metrics.lastUpdated = new Date();
      this.notifySubscribers('metrics', this.metrics);
    }
  }

  /**
   * システムアラートの作成
   */
  private createAlert(alertData: Partial<SystemAlert>): SystemAlert {
    const alert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: alertData.severity || 'info',
      message: alertData.message || 'システムイベントが発生しました',
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.unshift(alert); // 最新を先頭に追加
    
    // 最大100件のアラートを保持
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    this.notifySubscribers('alerts', alert);
    return alert;
  }

  /**
   * 購読者への通知
   */
  private notifySubscribers(topic: string, data: any) {
    const subscribers = this.subscribers.get(topic);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
        }
      });
    }
  }

  /**
   * 公開API: イベント購読
   */
  subscribe(topic: string, callback: Function) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(callback);

    // 購読解除用の関数を返す
    return () => {
      this.subscribers.get(topic)?.delete(callback);
    };
  }

  /**
   * 公開API: 現在のメトリクス取得
   */
  getCurrentMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  /**
   * 公開API: 最近のイベント取得
   */
  getRecentEvents(limit: number = 50): RealtimeEvent[] {
    return this.eventBuffer
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 公開API: 最近のアラート取得
   */
  getRecentAlerts(limit: number = 20): SystemAlert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * 公開API: アラートを解決済みにマーク
   */
  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.notifySubscribers('alerts', alert);
    }
  }

  /**
   * 公開API: すべてのチャネルを閉じる
   */
  disconnect() {
    this.channels.forEach(channel => {
      channel.unsubscribe();
    });
    this.channels.clear();
    this.subscribers.clear();
  }

  /**
   * 公開API: 手動でメトリクスをリフレッシュ
   */
  async refreshMetrics() {
    try {
      // データベースから現在の状況を直接取得
      const [activeDiagnoses, completedToday, activeUsers] = await Promise.all([
        supabase
          .from('diagnosis_sessions')
          .select('id')
          .eq('status', 'active')
          .then(result => result.data?.length || 0),
        
        supabase
          .from('diagnosis_sessions')
          .select('id')
          .eq('status', 'completed')
          .gte('created_at', new Date().toISOString().split('T')[0])
          .then(result => result.data?.length || 0),
        
        supabase
          .from('diagnosis_sessions')
          .select('id')
          .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .then(result => result.data?.length || 0)
      ]);

      this.metrics = {
        ...this.metrics,
        activeDiagnoses,
        completedDiagnoses: completedToday,
        activeUsers,
        lastUpdated: new Date()
      };

      this.notifySubscribers('metrics', this.metrics);
    } catch (error) {
      this.createAlert({
        severity: 'error',
        message: 'メトリクスの更新に失敗しました',
        metadata: { error: error.message }
      });
    }
  }
}

// シングルトンインスタンスをエクスポート
export const realtimeService = new RealtimeService();