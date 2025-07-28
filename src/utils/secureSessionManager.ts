// セキュアなセッション管理
import crypto from 'crypto';
import { secureLog } from '../config/clientSecurity';

interface SessionData {
  id: string;
  userId?: string;
  phoneNumber?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  fingerprint: string;
  isAuthenticated: boolean;
  rotationCount: number;
}

interface SessionOptions {
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  domain?: string;
  path: string;
}

export class SecureSessionManager {
  private static sessions = new Map<string, SessionData>();
  private static readonly SESSION_DURATION = 30 * 60 * 1000; // 30分
  private static readonly SESSION_ABSOLUTE_TIMEOUT = 12 * 60 * 60 * 1000; // 12時間
  private static readonly MAX_ROTATION_COUNT = 100; // セッション固定攻撃対策

  /**
   * セキュアなセッションID生成
   */
  static generateSessionId(): string {
    // 暗号学的に安全な128ビットのランダム値
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * セッション作成
   */
  static createSession(
    ipAddress: string,
    userAgent: string,
    fingerprint: string
  ): SessionData {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: SessionData = {
      id: sessionId,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION),
      ipAddress,
      userAgent,
      fingerprint,
      isAuthenticated: false,
      rotationCount: 0
    };

    this.sessions.set(sessionId, session);
    this.scheduleCleanup();

    secureLog('Session created', { 
      sessionId: sessionId.substring(0, 8) + '...',
      ipAddress,
      fingerprint: fingerprint.substring(0, 8) + '...'
    });

    return session;
  }

  /**
   * セッション検証
   */
  static validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    fingerprint: string
  ): { valid: boolean; reason?: string; requireRotation?: boolean } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    // 絶対タイムアウトチェック
    const absoluteTimeout = new Date(session.createdAt.getTime() + this.SESSION_ABSOLUTE_TIMEOUT);
    if (new Date() > absoluteTimeout) {
      this.destroySession(sessionId);
      return { valid: false, reason: 'SESSION_ABSOLUTE_TIMEOUT' };
    }

    // 有効期限チェック
    if (new Date() > session.expiresAt) {
      this.destroySession(sessionId);
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    // フィンガープリント変更検出
    if (session.fingerprint !== fingerprint) {
      secureLog('Session fingerprint mismatch detected', {
        sessionId: sessionId.substring(0, 8) + '...',
        expected: session.fingerprint.substring(0, 8) + '...',
        actual: fingerprint.substring(0, 8) + '...'
      });
      this.destroySession(sessionId);
      return { valid: false, reason: 'FINGERPRINT_MISMATCH' };
    }

    // IPアドレス変更検出（警告のみ）
    let requireRotation = false;
    if (session.ipAddress !== ipAddress) {
      secureLog('Session IP address changed', {
        sessionId: sessionId.substring(0, 8) + '...',
        oldIP: session.ipAddress,
        newIP: ipAddress
      });
      requireRotation = true;
    }

    // User-Agent変更検出
    if (session.userAgent !== userAgent) {
      secureLog('Session User-Agent changed', {
        sessionId: sessionId.substring(0, 8) + '...'
      });
      requireRotation = true;
    }

    // セッションをアクティブに保つ
    this.touchSession(sessionId);

    return { valid: true, requireRotation };
  }

  /**
   * セッションのアクティビティ更新
   */
  static touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.SESSION_DURATION);
    }
  }

  /**
   * セッションローテーション（セッション固定攻撃対策）
   */
  static rotateSession(oldSessionId: string): SessionData | null {
    const oldSession = this.sessions.get(oldSessionId);
    if (!oldSession) {
      return null;
    }

    // ローテーション回数チェック
    if (oldSession.rotationCount >= this.MAX_ROTATION_COUNT) {
      secureLog('Session rotation limit exceeded', {
        sessionId: oldSessionId.substring(0, 8) + '...',
        rotationCount: oldSession.rotationCount
      });
      this.destroySession(oldSessionId);
      return null;
    }

    // 新しいセッションを作成
    const newSessionId = this.generateSessionId();
    const newSession: SessionData = {
      ...oldSession,
      id: newSessionId,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION),
      rotationCount: oldSession.rotationCount + 1
    };

    // 古いセッションを削除し、新しいセッションを保存
    this.sessions.delete(oldSessionId);
    this.sessions.set(newSessionId, newSession);

    secureLog('Session rotated', {
      oldSessionId: oldSessionId.substring(0, 8) + '...',
      newSessionId: newSessionId.substring(0, 8) + '...',
      rotationCount: newSession.rotationCount
    });

    return newSession;
  }

  /**
   * セッション認証状態の更新
   */
  static authenticateSession(
    sessionId: string,
    userId: string,
    phoneNumber: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isAuthenticated = true;
    session.userId = userId;
    session.phoneNumber = phoneNumber;
    session.lastActivity = new Date();

    secureLog('Session authenticated', {
      sessionId: sessionId.substring(0, 8) + '...',
      userId
    });

    return true;
  }

  /**
   * セッション破棄
   */
  static destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      secureLog('Session destroyed', {
        sessionId: sessionId.substring(0, 8) + '...',
        duration: Date.now() - session.createdAt.getTime()
      });
    }
  }

  /**
   * ユーザーの全セッション破棄
   */
  static destroyUserSessions(userId: string): number {
    let count = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    secureLog('User sessions destroyed', { userId, count });
    return count;
  }

  /**
   * セッションクッキーオプション生成
   */
  static getCookieOptions(isProduction: boolean): SessionOptions {
    return {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: this.SESSION_DURATION,
      path: '/',
      ...(isProduction && { domain: '.moneyticket.com' })
    };
  }

  /**
   * 定期的なクリーンアップ
   */
  private static cleanupTimer: NodeJS.Timeout | null = null;

  private static scheduleCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      const now = new Date();
      let cleaned = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (now > session.expiresAt) {
          this.sessions.delete(sessionId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        secureLog('Session cleanup completed', { cleaned });
      }
    }, 5 * 60 * 1000); // 5分ごと
  }

  /**
   * セッション統計情報
   */
  static getStatistics(): {
    totalSessions: number;
    authenticatedSessions: number;
    averageSessionAge: number;
    sessionsPerIP: Map<string, number>;
  } {
    const stats = {
      totalSessions: this.sessions.size,
      authenticatedSessions: 0,
      totalAge: 0,
      sessionsPerIP: new Map<string, number>()
    };

    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (session.isAuthenticated) {
        stats.authenticatedSessions++;
      }

      stats.totalAge += now - session.createdAt.getTime();

      const ipCount = stats.sessionsPerIP.get(session.ipAddress) || 0;
      stats.sessionsPerIP.set(session.ipAddress, ipCount + 1);
    }

    return {
      totalSessions: stats.totalSessions,
      authenticatedSessions: stats.authenticatedSessions,
      averageSessionAge: stats.totalSessions > 0 ? stats.totalAge / stats.totalSessions : 0,
      sessionsPerIP: stats.sessionsPerIP
    };
  }

  /**
   * 同時セッション数制限
   */
  static enforceSessionLimit(userId: string, maxSessions: number = 5): void {
    const userSessions: Array<[string, SessionData]> = [];
    
    // ユーザーのセッションを収集
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.isAuthenticated) {
        userSessions.push([sessionId, session]);
      }
    }

    // 最大数を超えている場合、古いセッションから削除
    if (userSessions.length > maxSessions) {
      // lastActivityでソート（古い順）
      userSessions.sort((a, b) => 
        a[1].lastActivity.getTime() - b[1].lastActivity.getTime()
      );

      const toRemove = userSessions.length - maxSessions;
      for (let i = 0; i < toRemove; i++) {
        this.destroySession(userSessions[i][0]);
      }

      secureLog('Session limit enforced', {
        userId,
        removed: toRemove,
        remaining: maxSessions
      });
    }
  }
}