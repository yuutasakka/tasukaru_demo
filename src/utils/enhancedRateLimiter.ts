// 強化されたレート制限システム
// IP変更、電話番号回転、その他の回避攻撃への対策

import crypto from 'crypto';

interface DeviceFingerprint {
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
  webGLRenderer?: string;
}

interface RateLimitContext {
  phoneNumber: string;
  ipAddress: string;
  fingerprint: DeviceFingerprint;
  requestTime: Date;
  sessionId?: string;
}

export class EnhancedRateLimiter {
  // デバイスフィンガープリントの生成
  static generateDeviceFingerprint(context: DeviceFingerprint): string {
    const fingerprintData = [
      context.userAgent,
      context.screenResolution || '',
      context.timezone || '',
      context.language || '',
      context.platform || '',
      context.hardwareConcurrency?.toString() || '',
      context.deviceMemory?.toString() || '',
      context.touchSupport?.toString() || '',
      context.webGLRenderer || ''
    ].join('|');

    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  // IPアドレスのASN（自律システム番号）を取得してVPN/プロキシを検出
  static async detectVPNProxy(ipAddress: string): Promise<{
    isVPN: boolean;
    isProxy: boolean;
    isDatacenter: boolean;
    riskScore: number;
  }> {
    // 既知のVPN/プロキシIPレンジ
    const knownVPNRanges = [
      '10.0.0.0/8',     // プライベートIP
      '172.16.0.0/12',  // プライベートIP
      '192.168.0.0/16', // プライベートIP
      // 実際の実装では、外部サービス（IPQualityScore等）と連携
    ];

    // 簡易的なリスクスコア計算
    let riskScore = 0;
    
    // プライベートIPチェック
    if (this.isPrivateIP(ipAddress)) {
      riskScore += 50;
    }

    // データセンターIPチェック（簡易版）
    const datacenterPatterns = ['amazonaws', 'digitalocean', 'google', 'azure'];
    // 実際の実装では、逆引きDNSやASN情報を使用
    
    return {
      isVPN: riskScore > 30,
      isProxy: riskScore > 40,
      isDatacenter: riskScore > 20,
      riskScore: Math.min(riskScore, 100)
    };
  }

  // 電話番号の信頼性チェック
  static async validatePhoneNumberTrust(phoneNumber: string): Promise<{
    isVirtual: boolean;
    isBurner: boolean;
    carrier?: string;
    riskScore: number;
  }> {
    // 仮想番号のパターン
    const virtualNumberPatterns = [
      /^\+81[37]0/, // 日本のIP電話番号パターン
      /^\+8150/,    // 日本のIP電話番号パターン
    ];

    let riskScore = 0;

    // 仮想番号チェック
    for (const pattern of virtualNumberPatterns) {
      if (pattern.test(phoneNumber)) {
        riskScore += 50;
        break;
      }
    }

    // 短期間での頻繁な番号変更チェック
    // 実際の実装では、データベースで履歴を確認

    return {
      isVirtual: riskScore > 40,
      isBurner: riskScore > 60,
      carrier: 'unknown', // 実際の実装では、キャリア検出API使用
      riskScore: Math.min(riskScore, 100)
    };
  }

  // 行動パターン分析
  static async analyzeBehaviorPattern(
    context: RateLimitContext,
    history: RateLimitContext[]
  ): Promise<{
    suspiciousPattern: boolean;
    anomalyScore: number;
    flags: string[];
  }> {
    const flags: string[] = [];
    let anomalyScore = 0;

    // 1. 短時間での複数IP使用
    const recentIPs = new Set(
      history
        .filter(h => h.requestTime > new Date(Date.now() - 10 * 60 * 1000))
        .map(h => h.ipAddress)
    );

    if (recentIPs.size > 3) {
      flags.push('MULTIPLE_IPS_SHORT_TIME');
      anomalyScore += 30;
    }

    // 2. 異なるデバイスからの連続アクセス
    const recentFingerprints = new Set(
      history
        .filter(h => h.requestTime > new Date(Date.now() - 5 * 60 * 1000))
        .map(h => this.generateDeviceFingerprint(h.fingerprint))
    );

    if (recentFingerprints.size > 2) {
      flags.push('MULTIPLE_DEVICES_SHORT_TIME');
      anomalyScore += 40;
    }

    // 3. 地理的に不可能な移動
    // 実際の実装では、IP位置情報APIを使用
    
    // 4. 異常な時間パターン（深夜の大量リクエスト等）
    const currentHour = new Date().getHours();
    if (currentHour >= 2 && currentHour <= 5) {
      const nightRequests = history.filter(h => {
        const hour = h.requestTime.getHours();
        return hour >= 2 && hour <= 5;
      });
      
      if (nightRequests.length > 5) {
        flags.push('SUSPICIOUS_TIME_PATTERN');
        anomalyScore += 20;
      }
    }

    // 5. 連続した異なる番号への認証試行
    const uniquePhones = new Set(history.map(h => h.phoneNumber));
    if (uniquePhones.size > 5) {
      flags.push('PHONE_ENUMERATION');
      anomalyScore += 50;
    }

    return {
      suspiciousPattern: anomalyScore > 50,
      anomalyScore: Math.min(anomalyScore, 100),
      flags
    };
  }

  // トークンバケットアルゴリズムによるレート制限
  static createTokenBucket(capacity: number, refillRate: number) {
    let tokens = capacity;
    let lastRefill = Date.now();

    return {
      tryConsume: (tokensRequested: number = 1): boolean => {
        const now = Date.now();
        const timePassed = (now - lastRefill) / 1000;
        
        // トークンを補充
        tokens = Math.min(capacity, tokens + timePassed * refillRate);
        lastRefill = now;

        if (tokens >= tokensRequested) {
          tokens -= tokensRequested;
          return true;
        }
        
        return false;
      },
      
      getTokens: () => tokens,
      
      reset: () => {
        tokens = capacity;
        lastRefill = Date.now();
      }
    };
  }

  // プライベートIPアドレスチェック
  private static isPrivateIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);

    // 10.0.0.0/8
    if (first === 10) return true;
    
    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) return true;
    
    // 192.168.0.0/16
    if (first === 192 && second === 168) return true;
    
    // 127.0.0.0/8 (localhost)
    if (first === 127) return true;

    return false;
  }

  // 統合されたレート制限チェック
  static async checkRateLimit(context: RateLimitContext): Promise<{
    allowed: boolean;
    reason?: string;
    riskScore: number;
    requireCaptcha: boolean;
    requireAdditionalVerification: boolean;
  }> {
    let totalRiskScore = 0;
    const reasons: string[] = [];

    // 1. VPN/プロキシチェック
    const vpnCheck = await this.detectVPNProxy(context.ipAddress);
    if (vpnCheck.isVPN || vpnCheck.isProxy) {
      totalRiskScore += vpnCheck.riskScore;
      reasons.push('VPN_OR_PROXY_DETECTED');
    }

    // 2. 電話番号信頼性チェック
    const phoneCheck = await this.validatePhoneNumberTrust(context.phoneNumber);
    if (phoneCheck.isVirtual || phoneCheck.isBurner) {
      totalRiskScore += phoneCheck.riskScore;
      reasons.push('UNTRUSTED_PHONE_NUMBER');
    }

    // 3. 行動パターン分析（実際の実装では履歴をDBから取得）
    const behaviorAnalysis = await this.analyzeBehaviorPattern(context, []);
    if (behaviorAnalysis.suspiciousPattern) {
      totalRiskScore += behaviorAnalysis.anomalyScore;
      reasons.push(...behaviorAnalysis.flags);
    }

    // リスクスコアに基づいた判定
    const decision = {
      allowed: totalRiskScore < 50,
      reason: reasons.join(', '),
      riskScore: Math.min(totalRiskScore, 100),
      requireCaptcha: totalRiskScore >= 30,
      requireAdditionalVerification: totalRiskScore >= 70
    };

    return decision;
  }
}

// セッション管理クラス
export class SecureSessionManager {
  private static sessions = new Map<string, {
    fingerprint: string;
    ipAddress: string;
    createdAt: Date;
    lastActivity: Date;
    trustScore: number;
  }>();

  static createSession(
    sessionId: string,
    fingerprint: string,
    ipAddress: string
  ): void {
    this.sessions.set(sessionId, {
      fingerprint,
      ipAddress,
      createdAt: new Date(),
      lastActivity: new Date(),
      trustScore: 50 // 初期信頼スコア
    });
  }

  static validateSession(
    sessionId: string,
    fingerprint: string,
    ipAddress: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // フィンガープリントの一致確認
    if (session.fingerprint !== fingerprint) {
      // デバイス変更検出
      return false;
    }

    // IPアドレス変更の検出
    if (session.ipAddress !== ipAddress) {
      // 信頼スコアを下げる
      session.trustScore = Math.max(0, session.trustScore - 20);
    }

    // セッションタイムアウトチェック（30分）
    const inactivityLimit = 30 * 60 * 1000;
    if (Date.now() - session.lastActivity.getTime() > inactivityLimit) {
      this.sessions.delete(sessionId);
      return false;
    }

    session.lastActivity = new Date();
    return true;
  }

  static getSessionTrustScore(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.trustScore || 0;
  }
}