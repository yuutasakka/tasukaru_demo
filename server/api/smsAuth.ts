// SMS認証API - サーバーサイドのみ
// import { SecureConfigManager } from './secureConfig'; // 直接環境変数アクセスに変更
import { supabaseAdmin } from '../lib/supabaseAuth';

export class SMSAuthService {
  private static async getTwilioClient() {
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    };
    
    if (!config.accountSid || !config.authToken) {
      throw new Error('Twilio configuration not found');
    }

    // 本番環境ではTwilio SDKを使用
    try {
      // 動的インポートに変更（サーバーレス環境対応）
      const twilioModule = await import('twilio');
      const twilio = twilioModule.default;
      return twilio(config.accountSid, config.authToken);
    } catch (error) {
      // Twilio SDKが利用できない場合はHTTP API直接使用
      return {
        accountSid: config.accountSid,
        authToken: config.authToken,
        phoneNumber: config.phoneNumber,
        _isDirectAPI: true
      };
    }
  }

  static async sendOTP(phoneNumber: string, ipAddress?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 電話番号の正規化
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      if (!this.validatePhoneNumber(normalizedPhone)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // レート制限チェック（電話番号 + IP アドレス）
      try {
        const rateLimitOk = await this.checkRateLimit(normalizedPhone, ipAddress);
        if (!rateLimitOk) {
          return { success: false, error: 'SMS送信回数の上限に達しました。1時間後にお試しください。' };
        }
        // レート制限チェック成功
      } catch (rateLimitError: any) {
        // セキュリティ上、レート制限チェック失敗時は処理を停止
        return { success: false, error: 'サービスが一時的に利用できません。しばらくしてからお試しください。' };
      }

      const otp = await this.generateOTP();
      
      // 環境判定とTwilio設定チェック
      const isProduction = this.isProductionEnvironment();
      // 直接環境変数から取得（Vercelファンクション内での確実な動作のため）
      const config = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      };
      const hasTwilioConfig = config.accountSid && config.authToken && config.phoneNumber;
      
      if (!hasTwilioConfig) {
        return { success: false, error: 'SMS送信サービスが利用できません。管理者にお問い合わせください。' };
      }

      const client = await this.getTwilioClient();
      
      // OTPをデータベースに保存（5分間有効）
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      // Supabaseに保存（一時的にエラーハンドリング強化）
      try {
        await this.saveOTPToDatabase(normalizedPhone, otp, expiresAt, ipAddress);
        // OTPデータベース保存成功
      } catch (dbError: any) {
        // データベース保存失敗でもSMS送信は継続
      }
      
      // SMS送信
      
      if ((client as any)._isDirectAPI) {
        // Twilio HTTP API直接使用
        await this.sendSMSDirectAPI(client, normalizedPhone, otp);
      } else {
        // Twilio SDK使用
        const result = await (client as any).messages.create({
          body: `【タスカル】認証コード: ${otp}\n\n※5分間有効です。第三者には絶対に教えないでください。`,
          from: config.phoneNumber,
          to: normalizedPhone
        });
        // Twilio SDK送信完了
      }
      
      // SMS送信完了

      return { success: true };
    } catch (error: any) {
      return { success: false, error: `SMS送信に失敗しました: ${error?.message || 'Unknown error'}` };
    }
  }

  static async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // セキュリティ強化: 開発環境バイパス削除（本番環境準備）
      const isProduction = this.isProductionEnvironment();
      
      // データベースからOTPを確認（一時的にエラーハンドリング強化）
      let storedOTP = null;
      try {
        storedOTP = await this.getOTPFromDatabase(normalizedPhone);
        // OTPデータベース取得成功
      } catch (dbError: any) {
        // 開発環境でもOTPバイパスは無効化（セキュリティ上の理由）
        // 固定OTPは絶対に使用しない
        return { success: false, error: 'OTP verification failed' };
      }
      
      if (!storedOTP) {
        if (!isProduction) {
          // OTPがデータベースに存在しません
        }
        return { success: false, error: 'OTP not found or expired' };
      }
      

      // 試行回数チェック（5回まで）
      if (storedOTP.attempts >= 5) {
        return { success: false, error: 'OTP入力回数の上限に達しました。新しいOTPを取得してください。' };
      }

      // OTPの検証
      if (storedOTP.otp !== otp) {
        // 失敗回数をカウント
        await this.incrementOTPAttempts(normalizedPhone);
        const remainingAttempts = 5 - (storedOTP.attempts + 1);
        return { 
          success: false, 
          error: `認証コードが正しくありません。残り${remainingAttempts}回入力できます。` 
        };
      }
      

      // 期限チェック
      if (new Date() > storedOTP.expiresAt) {
        return { success: false, error: 'OTP has expired' };
      }

      // 成功時の処理
      await this.markOTPAsVerified(normalizedPhone);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Verification failed' };
    }
  }

  private static async generateOTP(): Promise<string> {
    // 暗号学的に安全な乱数生成
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(6);
      crypto.getRandomValues(array);
      return Array.from(array, byte => (byte % 10).toString()).join('');
    } else {
      // Node.js環境でのフォールバック
      const { randomBytes } = await import('crypto');
      const bytes = randomBytes(6);
      return Array.from(bytes, (byte: number) => (byte % 10).toString()).join('');
    }
  }

  private static normalizePhoneNumber(phone: string): string {
    // 全角数字を半角に変換
    let normalized = phone.replace(/[０-９]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
    
    // +81形式に統一（フロントエンドと同じ処理）
    normalized = normalized.replace(/\D/g, ''); // 数字以外を削除
    
    if (normalized.startsWith('0')) {
      // 0から始まる場合は+81に変換
      normalized = '+81' + normalized.substring(1);
    } else if (normalized.startsWith('81')) {
      // 81から始まる場合は+を追加
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+')) {
      // +がない場合は+81を追加
      normalized = '+81' + normalized;
    }
    
    return normalized;
  }

  private static validatePhoneNumber(phone: string): boolean {
    // +81形式の日本の電話番号パターン（フロントエンドと統一）
    const phoneRegex = /^\+81[1-9]\d{8,9}$/;
    return phoneRegex.test(phone);
  }
  
  // 環境判定メソッド - セキュリティ強化版（本番環境のみ）
  private static isProductionEnvironment(): boolean {
    // 本番環境の厳密判定 - 開発バイパスを完全に削除
    const nodeEnvProd = process.env.NODE_ENV === 'production';
    const vercelEnvProd = process.env.VERCEL_ENV === 'production';
    const prodFlag = process.env.PRODUCTION_MODE === 'true';
    
    // サーバーサイドでの厳密判定
    if (typeof window === 'undefined') {
      // サーバーサイドでは常に本番環境として扱う（セキュリティ強化）
      return true;
    }
    
    // クライアントサイドでの追加チェック（バックアップ）
    const hostname = window.location.hostname;
    // 本番環境以外は全て無効化
    const isNonProduction = hostname === 'localhost' || 
                            hostname.includes('127.0.0.1') || 
                            hostname.includes('0.0.0.0') ||
                            hostname.includes('preview') || 
                            hostname.includes('dev') || 
                            hostname.includes('staging') ||
                            hostname.includes('test');
    
    // 本番環境でのみ動作するよう厳密化
    return (nodeEnvProd || vercelEnvProd || prodFlag) && !isNonProduction;
  }

  // Twilio HTTP API直接使用
  private static async sendSMSDirectAPI(client: any, to: string, otp: string): Promise<void> {
    const auth = Buffer.from(`${client.accountSid}:${client.authToken}`).toString('base64');
    
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${client.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: client.phoneNumber,
        To: to,
        Body: `【タスカル】認証コード: ${otp}\n\n※5分間有効です。第三者には絶対に教えないでください。`
      })
    });


    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${errorData}`);
    }
    
    const result = await response.json();
  }

  // OTPをデータベースに保存
  private static async saveOTPToDatabase(phoneNumber: string, otp: string, expiresAt: Date, ipAddress?: string): Promise<void> {
    // supabaseAdmin は既にインポート済み
    
    // 既存のOTPを削除
    await supabaseAdmin
      .from('sms_verifications')
      .delete()
      .eq('phone_number', phoneNumber);

    // 新しいOTPを保存
    const { error } = await supabaseAdmin
      .from('sms_verifications')
      .insert({
        phone_number: phoneNumber,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        request_ip: ipAddress || 'unknown'
      });

    if (error) {
      throw new Error(`Failed to save OTP: ${error.message}`);
    }
  }

  // OTPをデータベースから取得
  private static async getOTPFromDatabase(phoneNumber: string): Promise<{ otp: string; expiresAt: Date; attempts: number } | null> {
    // supabaseAdmin は既にインポート済み
    
    const { data, error } = await supabaseAdmin
      .from('sms_verifications')
      .select('otp_code, expires_at, attempts')
      .eq('phone_number', phoneNumber)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      otp: data.otp_code,
      expiresAt: new Date(data.expires_at),
      attempts: data.attempts || 0
    };
  }

  // OTP試行回数を増加
  private static async incrementOTPAttempts(phoneNumber: string): Promise<void> {
    // supabaseAdmin は既にインポート済み
    
    await supabaseAdmin
      .from('sms_verifications')
      .update({ 
        attempts: supabaseAdmin.rpc('increment_attempts', { phone: phoneNumber })
      })
      .eq('phone_number', phoneNumber)
      .eq('is_verified', false);
  }

  // OTPを認証済みとしてマーク
  private static async markOTPAsVerified(phoneNumber: string): Promise<void> {
    // supabaseAdmin は既にインポート済み
    
    await supabaseAdmin
      .from('sms_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)
      .eq('is_verified', false);
  }

  // レート制限チェック（複数の制限軸）
  private static async checkRateLimit(phoneNumber: string, ipAddress?: string): Promise<boolean> {
    // supabaseAdmin は既にインポート済み
    
    try {
      // 1. 電話番号単位のレート制限（1時間に3回）
      const { data: phoneLimit, error: phoneError } = await supabaseAdmin
        .rpc('check_sms_rate_limit', { phone: phoneNumber });

      if (phoneError) {
        return false;
      }

      if (!phoneLimit) {
        return false; // 電話番号制限に達している
      }

      // 2. IPアドレス制限（IPがある場合）
      if (ipAddress) {
        // 2-1. IP単位の制限（1時間に10回）
        const { data: ipData } = await supabaseAdmin
          .from('sms_verifications')
          .select('created_at')
          .eq('request_ip', ipAddress)
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .limit(10);

        if (ipData && ipData.length >= 10) {
          return false; // IP単位の制限
        }

        // 2-2. グローバル制限（全体で1時間に100回）
        const { data: globalData } = await supabaseAdmin
          .from('sms_verifications')
          .select('created_at')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .limit(100);

        if (globalData && globalData.length >= 100) {
          return false; // グローバル制限
        }
      }

      // 3. 不審なパターンの検出
      const { data: recentAttempts } = await supabaseAdmin
        .from('sms_verifications')
        .select('phone_number, request_ip, created_at')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // 10分以内
        .limit(20);

      if (recentAttempts && recentAttempts.length > 0) {
        // 同一IPから複数の電話番号への送信をチェック
        const ipAttempts = recentAttempts.filter(a => a.request_ip === ipAddress);
        const uniquePhones = new Set(ipAttempts.map(a => a.phone_number));
        
        if (uniquePhones.size > 5) {
          return false; // 同一IPから5個以上の電話番号への送信を拒否
        }
      }

      return true;
    } catch (error) {
      return false; // エラーの場合は安全側に倒す
    }
  }

  // 電話番号をマスキングするユーティリティ関数
  private static maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '[MASKED]';
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    if (normalized.length < 4) return '[MASKED]';
    const visible = normalized.slice(-3); // 最後の3桁のみ表示
    const masked = '*'.repeat(normalized.length - 3);
    return masked + visible;
  }
}