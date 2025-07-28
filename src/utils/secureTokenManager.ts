// エンタープライズレベルのJWTトークン管理システム
import CryptoJS from 'crypto-js';
// import { SecureConfigManager } from '../api/secureConfig'; // サーバーサイドでのみ使用可能
import { secureLog } from '../config/clientSecurity';

// クライアントサイド用の代替実装
const SecureConfigManager = {
  getJWTSecret: async () => {
    console.warn('JWTの署名検証はサーバーサイドで行う必要があります');
    return '';
  }
};

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenId: string;
}

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  iat: number; // issued at
  exp: number; // expiration
  jti: string; // JWT ID
  typ: 'access' | 'refresh';
  aud: string; // audience
  iss: string; // issuer
  scope: string[];
  sessionId: string;
  deviceId: string;
  ipAddress: string;
}

export class SecureTokenManager {
  private static readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15分
  private static readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7日
  private static readonly TOKEN_ROTATION_THRESHOLD = 5 * 60 * 1000; // 5分前にローテーション
  
  private static readonly ISSUER = 'moneyticket-secure';
  private static readonly AUDIENCE = 'moneyticket-app';
  
  // トークンブラックリスト（メモリベース）
  private static blacklistedTokens = new Set<string>();
  private static tokenRotationHistory = new Map<string, number>();

  /**
   * セキュアなトークンペア生成
   */
  static async generateTokenPair(
    userId: string,
    email: string,
    sessionId: string,
    deviceId: string,
    ipAddress: string,
    scope: string[] = ['read', 'write']
  ): Promise<TokenPair> {
    try {
      const now = Date.now();
      const tokenId = this.generateSecureTokenId();
      
      // アクセストークンペイロード
      const accessPayload: TokenPayload = {
        sub: userId,
        email,
        iat: now,
        exp: now + this.ACCESS_TOKEN_EXPIRY,
        jti: tokenId,
        typ: 'access',
        aud: this.AUDIENCE,
        iss: this.ISSUER,
        scope,
        sessionId,
        deviceId,
        ipAddress
      };
      
      // リフレッシュトークンペイロード
      const refreshPayload: TokenPayload = {
        sub: userId,
        email,
        iat: now,
        exp: now + this.REFRESH_TOKEN_EXPIRY,
        jti: this.generateSecureTokenId(),
        typ: 'refresh',
        aud: this.AUDIENCE,
        iss: this.ISSUER,
        scope: ['refresh'],
        sessionId,
        deviceId,
        ipAddress
      };
      
      const accessToken = await this.signToken(accessPayload);
      const refreshToken = await this.signToken(refreshPayload);
      
      // トークンローテーション履歴を記録
      this.tokenRotationHistory.set(tokenId, now);
      
      secureLog('トークンペア生成', {
        userId,
        tokenId,
        sessionId,
        deviceId,
        scope: scope.join(',')
      });
      
      return {
        accessToken,
        refreshToken,
        expiresAt: accessPayload.exp,
        tokenId
      };
    } catch (error) {
      secureLog('トークン生成エラー:', error);
      throw new Error('トークン生成に失敗しました');
    }
  }

  /**
   * トークン検証
   */
  static async verifyToken(token: string, expectedType?: 'access' | 'refresh'): Promise<TokenPayload | null> {
    try {
      // ブラックリストチェック
      if (this.isTokenBlacklisted(token)) {
        secureLog('ブラックリスト済みトークン検出', { token: this.hashToken(token) });
        return null;
      }
      
      const payload = await this.verifyTokenSignature(token);
      if (!payload) {
        return null;
      }
      
      // 基本的な検証
      if (!this.validateTokenStructure(payload)) {
        secureLog('トークン構造が無効', { jti: payload.jti });
        return null;
      }
      
      // 期限切れチェック
      if (Date.now() >= payload.exp) {
        secureLog('期限切れトークン', { jti: payload.jti, exp: payload.exp });
        return null;
      }
      
      // タイプチェック
      if (expectedType && payload.typ !== expectedType) {
        secureLog('トークンタイプ不一致', { expected: expectedType, actual: payload.typ });
        return null;
      }
      
      // 発行者・オーディエンス検証
      if (payload.iss !== this.ISSUER || payload.aud !== this.AUDIENCE) {
        secureLog('トークン発行元/対象が無効', { iss: payload.iss, aud: payload.aud });
        return null;
      }
      
      return payload;
    } catch (error) {
      secureLog('トークン検証エラー:', error);
      return null;
    }
  }

  /**
   * トークンリフレッシュ（自動ローテーション）
   */
  static async refreshTokenPair(
    refreshToken: string,
    deviceId: string,
    ipAddress: string
  ): Promise<TokenPair | null> {
    try {
      const payload = await this.verifyToken(refreshToken, 'refresh');
      if (!payload) {
        return null;
      }
      
      // デバイスID・IPアドレスの検証
      if (payload.deviceId !== deviceId) {
        secureLog('デバイスID不一致でリフレッシュ拒否', { 
          expected: payload.deviceId, 
          actual: deviceId,
          userId: payload.sub
        });
        return null;
      }
      
      // IP アドレスの大幅な変更を検出
      if (!this.isIPAddressValid(payload.ipAddress, ipAddress)) {
        secureLog('IPアドレス変更でリフレッシュ拒否', {
          oldIP: payload.ipAddress,
          newIP: ipAddress,
          userId: payload.sub
        });
        return null;
      }
      
      // 古いトークンをブラックリストに追加
      this.blacklistToken(refreshToken);
      
      // 新しいトークンペアを生成
      const newTokenPair = await this.generateTokenPair(
        payload.sub,
        payload.email,
        payload.sessionId,
        payload.deviceId,
        ipAddress,
        payload.scope
      );
      
      secureLog('トークンリフレッシュ成功', {
        userId: payload.sub,
        oldTokenId: payload.jti,
        newTokenId: newTokenPair.tokenId
      });
      
      return newTokenPair;
    } catch (error) {
      secureLog('トークンリフレッシュエラー:', error);
      return null;
    }
  }

  /**
   * トークン無効化（ログアウト時）
   */
  static async revokeToken(token: string): Promise<boolean> {
    try {
      const payload = await this.verifyTokenSignature(token);
      if (payload) {
        this.blacklistToken(token);
        secureLog('トークン無効化', { jti: payload.jti, userId: payload.sub });
        return true;
      }
      return false;
    } catch (error) {
      secureLog('トークン無効化エラー:', error);
      return false;
    }
  }

  /**
   * セッション全体の無効化
   */
  static async revokeSession(sessionId: string): Promise<void> {
    try {
      // 実装では、データベースからセッションIDに関連するすべてのトークンを無効化
      // ここではメモリベースの実装
      secureLog('セッション無効化', { sessionId });
      
      // トークンローテーション履歴をクリア
      for (const [tokenId, timestamp] of this.tokenRotationHistory.entries()) {
        // 古い履歴をクリーンアップ（24時間以上古い）
        if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
          this.tokenRotationHistory.delete(tokenId);
        }
      }
    } catch (error) {
      secureLog('セッション無効化エラー:', error);
    }
  }

  /**
   * 自動トークンローテーション判定
   */
  static shouldRotateToken(payload: TokenPayload): boolean {
    const timeUntilExpiry = payload.exp - Date.now();
    return timeUntilExpiry <= this.TOKEN_ROTATION_THRESHOLD;
  }

  /**
   * トークン署名
   */
  private static async signToken(payload: TokenPayload): Promise<string> {
    try {
      const secret = await SecureConfigManager.getJWTSecret();
      if (!secret) {
        throw new Error('JWT署名キーが設定されていません');
      }
      
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      };
      
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      
      const signature = CryptoJS.HmacSHA256(signingInput, secret).toString(CryptoJS.enc.Base64url);
      
      return `${signingInput}.${signature}`;
    } catch (error) {
      secureLog('トークン署名エラー:', error);
      throw new Error('トークン署名に失敗しました');
    }
  }

  /**
   * トークン署名検証
   */
  private static async verifyTokenSignature(token: string): Promise<TokenPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const [encodedHeader, encodedPayload, signature] = parts;
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      
      const secret = await SecureConfigManager.getJWTSecret();
      if (!secret) {
        throw new Error('JWT署名キーが設定されていません');
      }
      
      const expectedSignature = CryptoJS.HmacSHA256(signingInput, secret).toString(CryptoJS.enc.Base64url);
      
      if (signature !== expectedSignature) {
        secureLog('トークン署名が無効');
        return null;
      }
      
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      return payload;
    } catch (error) {
      secureLog('トークン署名検証エラー:', error);
      return null;
    }
  }

  /**
   * トークン構造検証
   */
  private static validateTokenStructure(payload: any): payload is TokenPayload {
    const requiredFields = ['sub', 'email', 'iat', 'exp', 'jti', 'typ', 'aud', 'iss'];
    return requiredFields.every(field => payload.hasOwnProperty(field));
  }

  /**
   * セキュアなトークンID生成
   */
  private static generateSecureTokenId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(36)).join('');
    return `${timestamp}_${randomString}`;
  }

  /**
   * トークンブラックリスト管理
   */
  private static blacklistToken(token: string): void {
    const tokenHash = this.hashToken(token);
    this.blacklistedTokens.add(tokenHash);
    
    // ブラックリストのサイズ制限（メモリ効率）
    if (this.blacklistedTokens.size > 10000) {
      const tokensArray = Array.from(this.blacklistedTokens);
      this.blacklistedTokens.clear();
      // 最新の5000個のみ保持
      tokensArray.slice(-5000).forEach(hash => this.blacklistedTokens.add(hash));
    }
  }

  private static isTokenBlacklisted(token: string): boolean {
    const tokenHash = this.hashToken(token);
    return this.blacklistedTokens.has(tokenHash);
  }

  /**
   * トークンハッシュ化（プライバシー保護）
   */
  private static hashToken(token: string): string {
    return CryptoJS.SHA256(token).toString();
  }

  /**
   * IPアドレス検証
   */
  private static isIPAddressValid(oldIP: string, newIP: string): boolean {
    // 同一IPまたは同一サブネット（/24）なら許可
    if (oldIP === newIP) {
      return true;
    }
    
    // IPv4サブネット検証
    const oldParts = oldIP.split('.');
    const newParts = newIP.split('.');
    
    if (oldParts.length === 4 && newParts.length === 4) {
      // /24サブネット内なら許可
      return oldParts.slice(0, 3).join('.') === newParts.slice(0, 3).join('.');
    }
    
    return false;
  }

  /**
   * Base64URL エンコード/デコード
   */
  private static base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private static base64UrlDecode(str: string): string {
    str += '='.repeat((4 - str.length % 4) % 4);
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return atob(str);
  }

  /**
   * トークン統計情報取得（デバッグ用）
   */
  static getTokenStats(): {
    blacklistedCount: number;
    rotationHistoryCount: number;
  } {
    return {
      blacklistedCount: this.blacklistedTokens.size,
      rotationHistoryCount: this.tokenRotationHistory.size
    };
  }

  /**
   * 定期クリーンアップ
   */
  static cleanup(): void {
    const now = Date.now();
    
    // 古いローテーション履歴をクリア（24時間以上古い）
    for (const [tokenId, timestamp] of this.tokenRotationHistory.entries()) {
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        this.tokenRotationHistory.delete(tokenId);
      }
    }
    
    secureLog('トークンマネージャークリーンアップ完了', {
      remainingRotationHistory: this.tokenRotationHistory.size,
      blacklistedTokens: this.blacklistedTokens.size
    });
  }
}

// 定期クリーンアップの設定（12時間ごと）
if (typeof window !== 'undefined') {
  setInterval(() => {
    SecureTokenManager.cleanup();
  }, 12 * 60 * 60 * 1000);
}