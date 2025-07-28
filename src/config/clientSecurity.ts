// クライアントサイド用のセキュリティ設定
// 機密情報は含まない

export const CLIENT_SECURITY_CONFIG = {
  // 公開可能な設定のみ
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分
  PASSWORD_MIN_LENGTH: 12,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分
  REQUIRE_2FA: true,
  
  // デバッグ設定
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV !== 'production',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // 空のAPI設定（クライアントサイドでは使用しない）
  SECURITY_INTEGRATIONS: {},
  SECURITY_APIS: {},
  
  // セキュリティ設定のプレースホルダー
  // 実際の値はサーバーサイドでのみ管理
};

// SECURITY_CONFIGエイリアス（互換性のため）
export const SECURITY_CONFIG = CLIENT_SECURITY_CONFIG;

// セキュアログ関数（クライアントサイド版）
export const secureLog = (...args: any[]) => {
  if (CLIENT_SECURITY_CONFIG.ENABLE_DEBUG_LOGS) {
    console.log('[Security]', ...args);
  }
};

// Supabase設定（公開可能）
export const SUPABASE_CONFIG = {
  url: '',  // 動的に取得
  anonKey: '' // 動的に取得
};

// セキュアストレージクラス（クライアントサイド版）
export class SecureStorage {
  static setSecureItem(key: string, value: any): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      secureLog('SecureStorage error:', error);
    }
  }

  static getSecureItem(key: string): any | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      secureLog('SecureStorage error:', error);
      return null;
    }
  }

  static removeSecureItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  static computeHash(input: string): string {
    let hash = 0;
    if (input.length === 0) return hash.toString();
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// セキュア設定マネージャー（クライアントサイド版）
export class SecureConfigManager {
  static async getSecureConfig(key: string): Promise<string | null> {
    // クライアントサイドでは常にnullを返す
    return null;
  }

  static async getAdminCredentials(): Promise<any> {
    // クライアントサイドでは常にnullを返す
    return null;
  }

  static async updateAdminCredentials(updates: any): Promise<boolean> {
    // クライアントサイドでは常にfalseを返す
    return false;
  }

  static async getJWTSecret(): Promise<string> {
    // クライアントサイドでは使用しない
    throw new Error('JWT secret should not be accessed on client side');
  }

  static async getEncryptionKey(): Promise<string> {
    // クライアントサイドでは使用しない
    throw new Error('Encryption key should not be accessed on client side');
  }

  static clearCache(): void {
    // No-op on client side
  }
}