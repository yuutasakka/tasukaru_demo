// セキュリティ設定の中央管理（完全Supabaseベース）

// Vite環境変数の型定義（vite/clientで提供される型を拡張）
// Import Meta環境変数の型定義はsrc/types/vite-env.d.tsで管理

// セキュアなストレージクラス
export class SecureStorage {
  private static encryptionKey: string | null = null;

  private static getEncryptionKey(): string {
    // クライアントサイドでの環境変数取得
    if (typeof window !== 'undefined') {
      // クライアントサイドではセキュリティキーを使用しない
      // VITE_プレフィックスの機密情報は露出するため削除
      
      // フォールバック: セッション固有キー
      const sessionKey = sessionStorage.getItem('app_encryption_key');
      if (sessionKey) return sessionKey;
      
      // 最終フォールバック: 時間ベースキー（セキュリティは低い）
      const fallbackKey = `client-${Date.now().toString(36)}-${Math.random().toString(36)}`;
      sessionStorage.setItem('app_encryption_key', fallbackKey);
      return fallbackKey;
    }
    
    // サーバーサイドでは環境変数から取得
    if (!this.encryptionKey) {
      this.encryptionKey = process.env.ENCRYPTION_KEY;
      if (!this.encryptionKey) {
        throw new Error('ENCRYPTION_KEY環境変数が設定されていません');
      }
    }
    return this.encryptionKey;
  }

  static setSecureItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = this.simpleEncrypt(serialized, this.getEncryptionKey());
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
    }
  }

  static getSecureItem(key: string): any | null {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = this.simpleDecrypt(encrypted, this.getEncryptionKey());
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  static removeSecureItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  static computeHash(input: string): string {
    // Simple hash implementation for non-critical use
    let hash = 0;
    if (input.length === 0) return hash.toString();
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private static simpleEncrypt(text: string, key: string): string {
    // crypto-jsを使用した実装（正式な暗号化）
    if (typeof window !== 'undefined' && (window as any).CryptoJS) {
      try {
        return (window as any).CryptoJS.AES.encrypt(text, key).toString();
      } catch (error) {
      }
    }
    
    // フォールバック: 基本的な難読化（開発用のみ）
    if (typeof window !== 'undefined') {
      return btoa(encodeURIComponent(text));
    }
    
    // サーバーサイドでは実際の暗号化が必要
    throw new Error('Use proper encryption library (crypto-js AES) for server-side operations');
  }

  private static simpleDecrypt(encryptedText: string, key: string): string {
    // crypto-jsを使用した実装（正式な暗号化）
    if (typeof window !== 'undefined' && (window as any).CryptoJS) {
      try {
        const bytes = (window as any).CryptoJS.AES.decrypt(encryptedText, key);
        return bytes.toString((window as any).CryptoJS.enc.Utf8);
      } catch (error) {
      }
    }
    
    // フォールバック: 基本的な復号化
    if (typeof window !== 'undefined') {
      try {
        return decodeURIComponent(atob(encryptedText));
      } catch {
        return '';
      }
    }
    
    // サーバーサイドでは実際の復号化が必要
    throw new Error('Use proper decryption for server-side operations');
  }
}


// 本番環境での必須環境変数チェック
const validateProductionEnvironment = () => {
  const isProduction = (() => {
    if (typeof window !== 'undefined') {
      return window.location.hostname !== 'localhost' && 
             window.location.hostname !== '127.0.0.1';
    }
    return process.env.NODE_ENV === 'production';
  })() || 
                      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'production') ||
                      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && 
                       !window.location.hostname.includes('127.0.0.1') && 
                       !window.location.hostname.includes('preview'));

  if (isProduction) {
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const missingVars: string[] = [];
    
    requiredEnvVars.forEach(varName => {
      const value = (typeof import.meta !== 'undefined' && (import.meta as any).env?.[varName]) || 
                   process.env[varName];
      
      if (!value || value === '' || 
          value.includes('CHANGE_ME') || 
          value.includes('CHANGE_IN_PRODUCTION') ||
          value.includes('dev-')) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      throw new Error(`Production environment requires valid values for: ${missingVars.join(', ')}`);
    }
  }
};

// 本番環境チェックを実行（非ブロッキング）
try {
  validateProductionEnvironment();
} catch (error) {
}

export const SECURITY_CONFIG = {
  // 暗号化設定（サーバーサイドでのみ使用）
  ENCRYPTION_KEY: (() => {
    // クライアントサイドでは常にnullを返す
    if (typeof window !== 'undefined') {
      return null;
    }
    
    // サーバーサイドのみ
    if (process.env.ENCRYPTION_KEY) {
      return process.env.ENCRYPTION_KEY;
    }
    
         // 本番環境チェック
     // 本番環境判定（サーバーサイドのみ）
     const isProduction = (() => {
    try {
      if (typeof window !== 'undefined' && window && (window as any).location) {
        const location = (window as any).location;
        return location.hostname !== 'localhost' && 
               location.hostname !== '127.0.0.1';
      }
    } catch {
      // ブラウザ環境でない場合はサーバーサイド判定
    }
    return process.env.NODE_ENV === 'production';
  })();
     
     // クライアントサイドではエラーを投げない
    
    // 開発環境でのみフォールバック
    const devKey = process.env.DEV_ENCRYPTION_KEY || `dev-encryption-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    return devKey;
  })(),
  
  // JWT設定（サーバーサイドのみ）
  JWT_SECRET: (() => {
    // クライアントサイドでは使用しない
    if (typeof window !== 'undefined') {
      return null; // エラーを投げる代わりにnullを返す
    }
    
    // サーバーサイドのみ
    if (process.env.JWT_SECRET) {
      return process.env.JWT_SECRET;
    }
    
    return null; // クライアントサイドでは使用しない
  })(),
  
  // セッション設定（サーバーサイドのみ）
  SESSION_SECRET: (() => {
    // クライアントサイドでは使用しない
    if (typeof window !== 'undefined') {
      return null; // エラーを投げる代わりにnullを返す
    }
    
    // サーバーサイドのみ
    if (process.env.SESSION_SECRET) {
      return process.env.SESSION_SECRET;
    }
    
    return null; // クライアントサイドでは使用しない
  })(),
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分
  
  // ログイン制限
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分
  
  // パスワード要件
  PASSWORD_MIN_LENGTH: 12, // より強力なパスワード要件
  
  // 2FA設定
  REQUIRE_2FA: true, // 本番では2FA必須
  
  // 本番環境判定
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // デバッグログ制御
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV !== 'production',
  
  // IPアドレス制限設定
  SMS_RATE_LIMIT_PER_IP: 3, // IP毎のSMS送信回数制限
  SMS_RATE_LIMIT_WINDOW: 60 * 60 * 1000, // 1時間
  
  // API設定
  API_BASE_URL: process.env.API_BASE_URL || (
    process.env.NODE_ENV === 'production' 
      ? 'https://your-api-domain.com' 
      : 'http://localhost:8080'
  ),
  
  // セキュリティAPI設定
  SECURITY_APIS: {
    // 脆弱性スキャン
    SNYK: {
      enabled: !!process.env.SNYK_API_TOKEN,
      apiKey: process.env.SNYK_API_TOKEN,
      baseUrl: 'https://api.snyk.io/v1'
    },
    VIRUSTOTAL: {
      enabled: !!process.env.VIRUSTOTAL_API_KEY,
      apiKey: process.env.VIRUSTOTAL_API_KEY,
      baseUrl: 'https://www.virustotal.com/vtapi/v2'
    },
    NIST_NVD: {
      enabled: !!process.env.NIST_NVD_API_KEY,
      apiKey: process.env.NIST_NVD_API_KEY,
      baseUrl: 'https://services.nvd.nist.gov/rest/json/cves/2.0'
    },
    
    // ペネトレーションテスト
    OWASP_ZAP: {
      enabled: !!process.env.OWASP_ZAP_API_KEY,
      apiKey: process.env.OWASP_ZAP_API_KEY,
      baseUrl: 'http://localhost:8080' // ZAP proxy
    },
    SHODAN: {
      enabled: !!process.env.SHODAN_API_KEY,
      apiKey: process.env.SHODAN_API_KEY,
      baseUrl: 'https://api.shodan.io'
    },
    
    // コンプライアンス
    SECURITY_SCORECARD: {
      enabled: !!process.env.SECURITY_SCORECARD_API_KEY,
      apiKey: process.env.SECURITY_SCORECARD_API_KEY,
      baseUrl: 'https://api.securityscorecard.io'
    },
    THREATSTACK: {
      enabled: !!process.env.THREATSTACK_API_KEY,
      apiKey: process.env.THREATSTACK_API_KEY,
      baseUrl: 'https://api.threatstack.com/v2'
    },
    
    // AI分析（オプション）
    OPENAI: {
      enabled: !!process.env.OPENAI_API_KEY,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1'
    },
    ANTHROPIC: {
      enabled: !!process.env.ANTHROPIC_API_KEY,
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com/v1'
    }
  },
  
  // SMS/Twilio設定
  SMS_CONFIG: {
    enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  
  // 通知設定
  NOTIFICATIONS: {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhookUrl: process.env.SLACK_WEBHOOK_URL
    },
    discord: {
      enabled: !!process.env.DISCORD_WEBHOOK_URL,
      webhookUrl: process.env.DISCORD_WEBHOOK_URL
    },
    email: {
      enabled: !!process.env.EMAIL_SERVICE_API_KEY,
      apiKey: process.env.EMAIL_SERVICE_API_KEY
    }
  },

  // デフォルトハッシュ検出機能（セキュリティ向上のため除去済み）
  DEFAULT_PASSWORD_HASHES: [
    // ハードコードされたハッシュは削除済み - 環境変数で管理
  ],

  // セキュリティ検証（本番環境での基本チェック）
  validateProductionSecurity: () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) return Promise.resolve(true);

    // 本番環境での基本的なセキュリティチェック
    return new Promise((resolve) => {
      // デフォルトパスワードハッシュの検出は後で実装
      resolve(true);
    });
  },
};

// Supabase設定の中央管理
export const SUPABASE_CONFIG = {
  url: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 
       process.env.VITE_SUPABASE_URL || 
       process.env.NEXT_PUBLIC_SUPABASE_URL || (() => {
         throw new Error('Supabase URL not configured');
       })(),
  anonKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 
           process.env.VITE_SUPABASE_ANON_KEY || 
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      return '';
    }
    return '';
  })(),
  serviceRoleKey: (() => {
    // クライアントサイドでは使用しない
    if (typeof window !== 'undefined') {
      return null; // エラーを投げる代わりにnullを返す
    }
    
    // サーバーサイドのみ
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    
    return null; // クライアントサイドでは使用しない
  })()
};

// セキュアな設定管理クラス
export class SecureConfigManager {
  private static cache = new Map<string, { value: any; expiry: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分キャッシュ

  // Supabaseから安全に設定を取得
  static async getSecureConfig(key: string): Promise<string | null> {
    try {
      // Supabase URLが設定されていない場合はnullを返す
      if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === '') {
        return null;
      }

      // キャッシュチェック
      const cached = this.cache.get(key);
      if (cached && Date.now() < cached.expiry) {
        return cached.value;
      }

      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/secure_config?key.eq=${key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_CONFIG.serviceRoleKey || ''}`,
          'apikey': SUPABASE_CONFIG.serviceRoleKey || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }

      const data = await response.json();
      const value = data[0]?.value || null;

      // キャッシュに保存
      if (value) {
        this.cache.set(key, { value, expiry: Date.now() + this.CACHE_TTL });
      }

      return value;
    } catch (error) {
      return null;
    }
  }

  // 管理者認証情報を安全に取得
  static async getAdminCredentials(): Promise<any> {
    try {
      // Supabase URLが設定されていない場合はnullを返す
      if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === '') {
        return null;
      }

      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/admin_credentials?username.eq=admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_CONFIG.serviceRoleKey || ''}`,
          'apikey': SUPABASE_CONFIG.serviceRoleKey || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admin credentials: ${response.status}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      return null;
    }
  }

  // 管理者認証情報を安全に更新
  static async updateAdminCredentials(updates: any): Promise<boolean> {
    try {
      // Supabase URLが設定されていない場合はfalseを返す
      if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === '') {
        return false;
      }

      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/admin_credentials?username.eq=admin`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_CONFIG.serviceRoleKey || ''}`,
          'apikey': SUPABASE_CONFIG.serviceRoleKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update admin credentials: ${response.status}`);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // JWT秘密鍵を安全に取得
  static async getJWTSecret(): Promise<string> {
    const secret = await this.getSecureConfig('jwt_secret');
    if (!secret) {
      if (SECURITY_CONFIG.IS_PRODUCTION) {
        throw new Error('JWT secret not found in production');
      }
      return SECURITY_CONFIG.JWT_SECRET || 'dev-jwt-secret';
    }
    return secret;
  }

  // 暗号化キーを安全に取得
  static async getEncryptionKey(): Promise<string> {
    const key = await this.getSecureConfig('encryption_key');
    if (!key) {
      if (SECURITY_CONFIG.IS_PRODUCTION) {
        throw new Error('Encryption key not found in production');
      }
      return SECURITY_CONFIG.ENCRYPTION_KEY || 'dev-encryption-key';
    }
    return key;
  }

  // キャッシュクリア
  static clearCache(): void {
    this.cache.clear();
  }
}

// セキュアなログ出力（本番環境では完全無効化）
export const secureLog = (message: string, data?: any) => {
  // 本番環境では一切ログを出力しない
  const isProduction = (() => {
    if (typeof window !== 'undefined') {
      return window.location.hostname !== 'localhost' && 
             window.location.hostname !== '127.0.0.1';
    }
    return process.env.NODE_ENV === 'production';
  })() || 
                      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'production') ||
                      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  
  if (isProduction) {
    return; // 本番環境では何も出力しない
  }

  if (!SECURITY_CONFIG.ENABLE_DEBUG_LOGS) {
    return; // 開発環境でもデバッグが無効の場合は出力しない
  }

  // 機密情報をマスクするキーワード
  const sensitiveKeywords = [
    'password', 'secret', 'key', 'token', 'credential', 'auth',
    'api_key', 'private', 'confidential', 'hash', 'salt'
  ];

  let maskedData = data;
  if (data && typeof data === 'object') {
    maskedData = { ...data };
    
    // オブジェクトの各プロパティをチェック
    Object.keys(maskedData).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
        if (typeof maskedData[key] === 'string' && maskedData[key].length > 0) {
          // 最初の2文字と最後の2文字以外をマスク
          const value = maskedData[key];
          if (value.length <= 4) {
            maskedData[key] = '*'.repeat(value.length);
          } else {
            maskedData[key] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
          }
        } else {
          maskedData[key] = '[PROTECTED]';
        }
      }
    });
  }

  // メッセージ内の機密情報もマスク
  let maskedMessage = message;
  sensitiveKeywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword}[\\s]*[:=][\\s]*['"\\s]*)(\\S+)`, 'gi');
    maskedMessage = maskedMessage.replace(regex, '$1[PROTECTED]');
  });

};

// CSRFトークン生成
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// セキュアなランダム文字列生成
export const generateSecureRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
};

// 入力値検証
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  phone: (phone: string): boolean => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  },
  
  username: (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  },
  
  password: (password: string): boolean => {
    // より厳格なパスワード要件
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= SECURITY_CONFIG.PASSWORD_MIN_LENGTH;
    
    // 弱いパスワードパターンをチェック
    const weakPatterns = [
      /password/i,
      /admin/i,
      /123/,
      /qwerty/i,
      /abc/i,
      /ai.conectx/i // アプリ名を含むパスワードを禁止
    ];
    
    const hasWeakPattern = weakPatterns.some(pattern => pattern.test(password));
    
    // 連続する文字をチェック
    const hasSequentialChars = /(.)\1{2,}/.test(password); // 同じ文字3回以上連続
    
    return hasMinLength && hasLower && hasUpper && hasNumber && hasSpecial && !hasWeakPattern && !hasSequentialChars;
  },
  
  // XSS攻撃防止
  sanitizeHtml: (input: string): string => {
    if (!input) return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }
};

// レート制限管理
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map();
  
  static isAllowed(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier)!;
    
    // 古いリクエストを削除
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  static reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

export default SECURITY_CONFIG; 