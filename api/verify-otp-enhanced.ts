import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
  fingerprint?: string;
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, X-Device-Fingerprint');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { phoneNumber, otp, fingerprint } = req.body as VerifyOTPRequest;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: '電話番号と認証コードが必要です' });
    }

    // ヘッダーから追加情報を取得
    const sessionId = req.headers['x-session-id'] as string;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string || fingerprint;

    // IPアドレス取得
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

    // OTPレコードを取得
    const { data: otpRecord, error: fetchError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      // 認証試行ログを記録
      await supabase.from('auth_attempts').insert({
        phone_number: normalizedPhone,
        ip_address: clientIP,
        fingerprint_hash: deviceFingerprint,
        session_id: sessionId,
        attempt_type: 'verify_otp',
        status: 'failed',
        risk_score: 0,
        risk_flags: ['OTP_NOT_FOUND']
      });

      return res.status(400).json({ 
        error: '認証コードが見つかりません。新しいコードを取得してください。'
      });
    }

    // 有効期限チェック
    const expiresAt = new Date(otpRecord.expires_at);
    if (new Date() > expiresAt) {
      // 期限切れの認証試行ログを記録
      await supabase.from('auth_attempts').insert({
        phone_number: normalizedPhone,
        ip_address: clientIP,
        fingerprint_hash: deviceFingerprint,
        session_id: sessionId,
        attempt_type: 'verify_otp',
        status: 'failed',
        risk_score: 20,
        risk_flags: ['OTP_EXPIRED']
      });

      return res.status(400).json({ 
        error: '認証コードの有効期限が切れています。新しいコードを取得してください。'
      });
    }

    // 試行回数チェック
    if (otpRecord.attempts >= 5) {
      // 試行回数超過の認証試行ログを記録
      await supabase.from('auth_attempts').insert({
        phone_number: normalizedPhone,
        ip_address: clientIP,
        fingerprint_hash: deviceFingerprint,
        session_id: sessionId,
        attempt_type: 'verify_otp',
        status: 'blocked',
        risk_score: 50,
        risk_flags: ['MAX_ATTEMPTS_EXCEEDED']
      });

      return res.status(400).json({ 
        error: 'OTP入力回数の上限に達しました。新しいOTPを取得してください。',
        remainingAttempts: 0
      });
    }

    // デバイスフィンガープリントの検証（送信時と同じデバイスか）
    let fingerprintMismatch = false;
    if (otpRecord.fingerprint_hash && deviceFingerprint) {
      if (otpRecord.fingerprint_hash !== deviceFingerprint) {
        fingerprintMismatch = true;
        console.warn('Device fingerprint mismatch detected');
      }
    }

    // セッションIDの検証
    let sessionMismatch = false;
    if (otpRecord.session_id && sessionId) {
      if (otpRecord.session_id !== sessionId) {
        sessionMismatch = true;
        console.warn('Session ID mismatch detected');
      }
    }

    // OTPの検証
    if (otpRecord.otp_code !== otp) {
      // 失敗回数をインクリメント
      await supabase
        .from('sms_verifications')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = 5 - (otpRecord.attempts + 1);

      // 失敗の認証試行ログを記録
      await supabase.from('auth_attempts').insert({
        phone_number: normalizedPhone,
        ip_address: clientIP,
        fingerprint_hash: deviceFingerprint,
        session_id: sessionId,
        attempt_type: 'verify_otp',
        status: 'failed',
        risk_score: 30 + (fingerprintMismatch ? 20 : 0) + (sessionMismatch ? 10 : 0),
        risk_flags: [
          'INVALID_OTP',
          ...(fingerprintMismatch ? ['DEVICE_MISMATCH'] : []),
          ...(sessionMismatch ? ['SESSION_MISMATCH'] : [])
        ]
      });

      return res.status(400).json({ 
        error: `認証コードが正しくありません。残り${remainingAttempts}回入力できます。`,
        remainingAttempts
      });
    }

    // 成功時の処理
    // 1. OTPを認証済みとしてマーク
    await supabase
      .from('sms_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    // 2. ユーザー情報を更新または作成
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        phone_number: normalizedPhone,
        last_verified_at: new Date().toISOString(),
        verification_count: supabase.rpc('increment', { row_id: normalizedPhone })
      }, {
        onConflict: 'phone_number'
      })
      .select()
      .single();

    if (userError) {
      console.error('User update error:', userError);
    }

    // 3. 電話番号の評価を更新
    await supabase
      .from('phone_reputation')
      .upsert({
        phone_number: normalizedPhone,
        verification_count: supabase.rpc('increment', { row_id: normalizedPhone }),
        last_verification: new Date().toISOString(),
        risk_score: Math.max(0, (otpRecord.risk_score || 0) - 10) // 成功時はリスクスコアを下げる
      }, {
        onConflict: 'phone_number'
      });

    // 4. デバイスの信頼スコアを更新
    if (deviceFingerprint) {
      await supabase
        .from('device_fingerprints')
        .update({
          trust_score: supabase.rpc('increment', { row_id: deviceFingerprint, amount: 5 }),
          last_seen: new Date().toISOString()
        })
        .eq('fingerprint_hash', deviceFingerprint);
    }

    // 5. 成功の認証試行ログを記録
    await supabase.from('auth_attempts').insert({
      phone_number: normalizedPhone,
      ip_address: clientIP,
      fingerprint_hash: deviceFingerprint,
      session_id: sessionId,
      attempt_type: 'verify_otp',
      status: 'success',
      risk_score: Math.max(0, (otpRecord.risk_score || 0) - 10),
      risk_flags: []
    });

    // セキュリティヘッダー設定
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // 成功レスポンス
    res.status(200).json({ 
      success: true,
      message: '認証に成功しました',
      user: {
        phoneNumber: normalizedPhone,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: '認証処理中にエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}