import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// リクエストボディの型定義
interface SendOTPRequest {
  phoneNumber: string;
  deviceInfo?: {
    fingerprint?: string;
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
  };
}

// レスポンスの型定義
interface RateLimitCheckResult {
  allowed: boolean;
  risk_score: number;
  risk_flags: string[];
  require_captcha: boolean;
  phone_count: number;
  ip_count: number;
  unique_phones_per_ip: number;
  unique_ips_per_phone: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS設定
  const allowedOrigins = [
    'https://moneyticket.vercel.app',
    'https://moneyticket-git-main-sakkayuta.vercel.app',
    'https://moneyticket-git-main-seai0520s-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, X-Device-Fingerprint, X-Captcha-Token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { phoneNumber, deviceInfo } = req.body as SendOTPRequest;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: '電話番号が必要です' });
    }

    // ヘッダーから追加情報を取得
    const sessionId = req.headers['x-session-id'] as string;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
    const captchaToken = req.headers['x-captcha-token'] as string;

    // IPアドレス取得（Vercelの場合）
    const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                    req.headers['x-real-ip']?.toString() || 
                    'unknown';

    // Supabase設定
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'データベース接続エラー'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 電話番号の正規化
    let normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+81' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    // 電話番号の検証
    const phoneRegex = /^\+81[1-9]\d{8,9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({ error: '無効な電話番号形式です' });
    }

    // 強化されたレート制限チェック
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      'check_enhanced_rate_limit',
      {
        p_phone: normalizedPhone,
        p_ip: clientIP,
        p_fingerprint: deviceFingerprint || null,
        p_session_id: sessionId || null
      }
    ) as { data: RateLimitCheckResult | null; error: any };

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return res.status(500).json({ 
        error: 'レート制限チェックエラー'
      });
    }

    if (!rateLimitResult || !rateLimitResult.allowed) {
      // リスクフラグに基づいた詳細なエラーメッセージ
      const riskFlags = rateLimitResult?.risk_flags || [];
      let errorMessage = 'リクエストが制限されています';
      
      if (riskFlags.includes('PHONE_RATE_LIMIT')) {
        errorMessage = 'SMS送信回数の上限に達しました。1時間後にお試しください。';
      } else if (riskFlags.includes('IP_RATE_LIMIT')) {
        errorMessage = 'このIPアドレスからのリクエストが多すぎます。';
      } else if (riskFlags.includes('PHONE_ENUMERATION')) {
        errorMessage = '不審なアクセスパターンが検出されました。';
      } else if (riskFlags.includes('SUSPICIOUS_IP') || riskFlags.includes('SUSPICIOUS_PHONE')) {
        errorMessage = 'セキュリティ上の理由により、このリクエストは処理できません。';
      }

      return res.status(429).json({ 
        error: errorMessage,
        riskScore: rateLimitResult?.risk_score || 100,
        riskFlags,
        requireCaptcha: true,
        requireAdditionalVerification: (rateLimitResult?.risk_score || 100) >= 70
      });
    }

    // CAPTCHAが必要な場合の検証
    if (rateLimitResult.require_captcha && !captchaToken) {
      return res.status(400).json({ 
        error: 'CAPTCHA認証が必要です',
        requireCaptcha: true,
        riskScore: rateLimitResult.risk_score
      });
    }

    // CAPTCHAトークンの検証（実装する場合）
    if (captchaToken) {
      // Google reCAPTCHA APIを使用してトークンを検証
      // const captchaValid = await verifyCaptchaToken(captchaToken);
      // if (!captchaValid) {
      //   return res.status(400).json({ error: 'CAPTCHA認証に失敗しました' });
      // }
    }

    // デバイス情報を保存/更新
    if (deviceFingerprint && deviceInfo) {
      const { error: deviceError } = await supabase
        .from('device_fingerprints')
        .upsert({
          fingerprint_hash: deviceFingerprint,
          user_agent: deviceInfo.userAgent,
          screen_resolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone,
          language: deviceInfo.language,
          platform: deviceInfo.platform,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'fingerprint_hash'
        });

      if (deviceError) {
        console.error('Device fingerprint save error:', deviceError);
      }
    }

    // 既に認証済みのユーザーかチェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, last_verified_at, created_at')
      .eq('phone_number', normalizedPhone)
      .single();

    if (existingUser && existingUser.last_verified_at) {
      const lastVerified = new Date(existingUser.last_verified_at);
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      if (lastVerified > oneYearAgo) {
        const nextAvailableDate = new Date(lastVerified);
        nextAvailableDate.setFullYear(nextAvailableDate.getFullYear() + 1);
        
        return res.status(400).json({ 
          error: `この電話番号は既に診断済みです。次回の診断は ${nextAvailableDate.toLocaleDateString('ja-JP')} 以降に可能です。`,
          alreadyVerified: true,
          lastVerifiedAt: lastVerified.toISOString(),
          nextAvailableAt: nextAvailableDate.toISOString()
        });
      }
    }

    // OTP生成（暗号学的に安全な方法）
    const otpBuffer = crypto.randomBytes(3);
    const otp = (parseInt(otpBuffer.toString('hex'), 16) % 900000 + 100000).toString();

    // 既存のOTPを削除
    await supabase
      .from('sms_verifications')
      .delete()
      .eq('phone_number', normalizedPhone)
      .eq('is_verified', false);

    // 新しいOTPを保存（5分間有効）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const { error: saveError } = await supabase
      .from('sms_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_verified: false,
        request_ip: clientIP,
        user_agent: deviceInfo?.userAgent || req.headers['user-agent'] || '',
        fingerprint_hash: deviceFingerprint || null,
        session_id: sessionId || null,
        risk_score: rateLimitResult.risk_score,
        risk_flags: rateLimitResult.risk_flags,
        required_captcha: rateLimitResult.require_captcha
      });

    if (saveError) {
      console.error('OTP save error:', saveError);
      return res.status(500).json({ 
        error: 'OTP保存に失敗しました' 
      });
    }

    // Twilio設定
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ 
        error: 'SMS送信サービスが利用できません。管理者にお問い合わせください。'
      });
    }

    // Twilio SDKをインポート
    const twilio = (await import('twilio')).default;
    const client = twilio(accountSid, authToken);

    // SMS送信
    try {
      const message = await client.messages.create({
        body: `【タスカル】認証コード: ${otp}\n\n※5分間有効です。第三者には絶対に教えないでください。`,
        from: fromNumber,
        to: normalizedPhone
      });

      // SMS送信成功（本番環境ではログ出力しない）
    } catch (twilioError: any) {
      console.error('Twilio send error:', twilioError);
      
      // Twilioエラーの場合でもOTPは保存されているので、開発環境では成功とする
      if (process.env.NODE_ENV !== 'production') {
        // 開発モード: 実際のSMS送信をスキップ
      } else {
        return res.status(500).json({ 
          error: 'SMS送信に失敗しました',
          // 本番環境ではエラー詳細を隠蔽
          details: process.env.NODE_ENV === 'development' ? twilioError.message : undefined
        });
      }
    }

    // セキュリティヘッダー設定
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    res.status(200).json({ 
      success: true,
      riskScore: rateLimitResult.risk_score,
      sessionId: sessionId || crypto.randomUUID()
    });

  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'SMS送信に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}