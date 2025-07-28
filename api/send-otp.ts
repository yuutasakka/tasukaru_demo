import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS設定 - 本番環境用
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: '電話番号が必要です' });
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

    // 既に認証済みのユーザーかチェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, last_verified_at, created_at')
      .eq('phone_number', normalizedPhone)
      .single();

    if (existingUser && existingUser.last_verified_at) {
      const lastVerified = new Date(existingUser.last_verified_at);
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      // 1年以内に診断済みの場合はSMS送信をブロック
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

    // IPアドレス取得
    const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                    req.headers['x-real-ip']?.toString() || 
                    'unknown';

    // レート制限チェック（1時間に3回まで）
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: rateLimitError } = await supabase
      .from('sms_verifications')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .gte('created_at', oneHourAgo);

    if (rateLimitError) {
    } else if (recentAttempts && recentAttempts.length >= 3) {
      return res.status(429).json({ 
        error: 'SMS送信回数の上限に達しました。1時間後にお試しください。' 
      });
    }

    // IPアドレスベースのレート制限（1時間に10回まで）
    const { data: recentIPAttempts } = await supabase
      .from('sms_verifications')
      .select('id')
      .eq('request_ip', clientIP)
      .gte('created_at', oneHourAgo);

    if (recentIPAttempts && recentIPAttempts.length >= 10) {
      return res.status(429).json({ 
        error: 'このIPアドレスからのリクエストが多すぎます。しばらく待ってからお試しください。' 
      });
    }

    // OTP生成（6桁の数字）
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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
        request_ip: clientIP
      });

    if (saveError) {
      return res.status(500).json({ 
        error: 'OTP保存に失敗しました' 
      });
    }

    // Twilio SDKをインポート
    const twilio = (await import('twilio')).default;
    const client = twilio(accountSid, authToken);

    // SMS送信
    const message = await client.messages.create({
      body: `【タスカル】認証コード: ${otp}\n\n※5分間有効です。第三者には絶対に教えないでください。`,
      from: fromNumber,
      to: normalizedPhone
    });


    // セキュリティヘッダー設定
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    res.status(200).json({ success: true });

  } catch (error: any) {
    res.status(500).json({
      error: 'SMS送信に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}