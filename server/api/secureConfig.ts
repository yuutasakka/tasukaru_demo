// セキュア設定API - サーバーサイドのみ
// 警告: このファイルはクライアントサイドにインポートされてはいけません

if (typeof window !== 'undefined') {
  throw new Error('セキュリティエラー: secureConfig.tsはサーバーサイドでのみ使用可能です');
}

import { supabaseAdmin } from '../lib/supabaseAuth';
import crypto from 'crypto';

interface SecureConfig {
  key: string;
  value: string;
  encrypted?: boolean;
}

export class SecureConfigManager {
  private static encryptionKey = process.env.ENCRYPTION_KEY;

  // 暗号化 - AES-256-CBCモード使用（セキュア）
  private static encrypt(text: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not found');
    
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16); // CBCでは128ビット
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32); // 32バイトキー生成
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // 復号化 - AES-256-CBCモード使用（セキュア）
  private static decrypt(encryptedText: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not found');
    
    const algorithm = 'aes-256-cbc';
    const parts = encryptedText.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32); // 32バイトキー生成
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // セキュア設定の保存
  static async saveSecureConfig(key: string, value: string, encrypt = true): Promise<boolean> {
    try {
      const finalValue = encrypt ? this.encrypt(value) : value;
      
      const { error } = await supabaseAdmin
        .from('secure_configs')
        .upsert({
          config_key: key,
          config_value: finalValue,
          encrypted: encrypt,
          updated_at: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      return false;
    }
  }

  // セキュア設定の取得
  static async getSecureConfig(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('secure_configs')
        .select('config_value, encrypted')
        .eq('config_key', key)
        .single();

      if (error || !data) return null;

      return data.encrypted ? this.decrypt(data.config_value) : data.config_value;
    } catch (error) {
      return null;
    }
  }

  // Twilio設定の取得
  static async getTwilioConfig() {
    const accountSid = await this.getSecureConfig('twilio_account_sid') || process.env.TWILIO_ACCOUNT_SID;
    const authToken = await this.getSecureConfig('twilio_auth_token') || process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = await this.getSecureConfig('twilio_phone_number') || process.env.TWILIO_PHONE_NUMBER;

    return { accountSid, authToken, phoneNumber };
  }

  // JWT設定の取得
  static async getJWTSecret(): Promise<string> {
    const secret = await this.getSecureConfig('jwt_secret') || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRETが設定されていません');
    }
    return secret;
  }

  // Gemini API設定の取得
  static async getGeminiAPIKey(): Promise<string> {
    return await this.getSecureConfig('gemini_api_key') || process.env.GEMINI_API_KEY || '';
  }

  // セッション設定の取得
  static async getSessionSecret(): Promise<string> {
    const secret = await this.getSecureConfig('session_secret') || process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('SESSION_SECRETが設定されていません');
    }
    return secret;
  }

  // CSRF設定の取得
  static async getCSRFSecret(): Promise<string> {
    const secret = await this.getSecureConfig('csrf_secret') || process.env.CSRF_SECRET;
    if (!secret) {
      throw new Error('CSRF_SECRETが設定されていません');
    }
    return secret;
  }

  // 暗号化キーの取得
  static async getEncryptionKey(): Promise<string> {
    return await this.getSecureConfig('encryption_key') || process.env.ENCRYPTION_KEY || '';
  }

  // アプリケーション設定の取得
  static async getAppConfig() {
    const title = await this.getSecureConfig('app_title') || process.env.VITE_APP_TITLE || 'タスカル';
    const version = await this.getSecureConfig('app_version') || process.env.VITE_APP_VERSION || '1.0.0';
    const description = await this.getSecureConfig('app_description') || process.env.VITE_APP_DESCRIPTION || '資産運用診断アプリケーション';
    
    return { title, version, description };
  }

  // レート制限設定の取得
  static async getRateLimitConfig() {
    const windowMs = parseInt(await this.getSecureConfig('rate_limit_window_ms') || process.env.RATE_LIMIT_WINDOW_MS || '900000');
    const maxRequests = parseInt(await this.getSecureConfig('rate_limit_max_requests') || process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    const smsRateMax = parseInt(await this.getSecureConfig('sms_rate_limit_max') || process.env.SMS_RATE_LIMIT_MAX || '5');
    const authRateMax = parseInt(await this.getSecureConfig('auth_rate_limit_max') || process.env.AUTH_RATE_LIMIT_MAX || '10');
    
    return { windowMs, maxRequests, smsRateMax, authRateMax };
  }

  // セキュリティオプションの取得
  static async getSecurityOptions() {
    const enableHeaders = (await this.getSecureConfig('enable_security_headers') || process.env.ENABLE_SECURITY_HEADERS || 'true') === 'true';
    const enableRateLimit = (await this.getSecureConfig('enable_rate_limiting') || process.env.ENABLE_RATE_LIMITING || 'true') === 'true';
    const enableLogging = (await this.getSecureConfig('enable_request_logging') || process.env.ENABLE_REQUEST_LOGGING || 'true') === 'true';
    const enableCorsStrict = (await this.getSecureConfig('enable_cors_strict') || process.env.ENABLE_CORS_STRICT || 'true') === 'true';
    
    return { enableHeaders, enableRateLimit, enableLogging, enableCorsStrict };
  }

  // 設定の初期化（必要な設定がSupabaseに存在しない場合の初期化）
  static async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
      { key: 'app_title', value: 'タスカル', encrypt: false },
      { key: 'app_version', value: '1.0.0', encrypt: false },
      { key: 'app_description', value: '資産運用診断アプリケーション', encrypt: false },
      { key: 'rate_limit_window_ms', value: '900000', encrypt: false },
      { key: 'rate_limit_max_requests', value: '100', encrypt: false },
      { key: 'sms_rate_limit_max', value: '5', encrypt: false },
      { key: 'auth_rate_limit_max', value: '10', encrypt: false },
      { key: 'enable_security_headers', value: 'true', encrypt: false },
      { key: 'enable_rate_limiting', value: 'true', encrypt: false },
      { key: 'enable_request_logging', value: 'true', encrypt: false },
      { key: 'enable_cors_strict', value: 'true', encrypt: false },
    ];

    for (const config of defaultConfigs) {
      const existing = await this.getSecureConfig(config.key);
      if (!existing) {
        await this.saveSecureConfig(config.key, config.value, config.encrypt);
      }
    }
  }

  // 全設定の一覧取得（管理用）
  static async getAllConfigs(): Promise<SecureConfig[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('secure_configs')
        .select('config_key, encrypted, updated_at')
        .order('config_key');

      if (error) throw error;

      return data.map(item => ({
        key: item.config_key,
        value: item.encrypted ? '[ENCRYPTED]' : '[VISIBLE]',
        encrypted: item.encrypted
      }));
    } catch (error) {
      return [];
    }
  }
}