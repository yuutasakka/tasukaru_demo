import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS設定
  const origin = req.headers.origin;
  if (origin && origin.includes('vercel.app')) {
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
    const { phoneNumber, code, otp } = req.body;
    const otpCode = code || otp;
    
    if (!phoneNumber || !otpCode) {
      res.status(400).json({ error: '電話番号と認証コードが必要です' });
      return;
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
      return res.status(400).json({ 
        error: '認証コードが見つかりません。新しいコードを取得してください。' 
      });
    }

    // 有効期限チェック
    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ 
        error: '認証コードの有効期限が切れています。新しいコードを取得してください。' 
      });
    }

    // 試行回数チェック
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ 
        error: 'OTP入力回数の上限に達しました。新しいコードを取得してください。' 
      });
    }

    // OTPコードの検証
    if (otpRecord.otp_code !== otpCode) {
      // 試行回数を増加
      await supabase
        .from('sms_verifications')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({ 
        error: `認証コードが正しくありません。残り${remainingAttempts}回入力できます。` 
      });
    }

    // OTPを認証済みとしてマーク
    const { error: updateError } = await supabase
      .from('sms_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      return res.status(500).json({ 
        error: '認証処理中にエラーが発生しました' 
      });
    }


    // セキュリティヘッダー設定
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    res.status(200).json({ success: true });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'OTP検証に失敗しました'
    });
  }
}