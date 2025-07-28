import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// デモ用設定
const DEMO_CONFIG = {
  phoneNumbers: [
    '09000000001', '09000000002', '09000000003', '09000000004', '09000000005',
    '09000000006', '09000000007', '09000000008', '09000000009', '09000000010'
  ],
  otpCode: '123456',
  allowedOrigins: [
    'https://moneyticket.vercel.app',
    'https://moneyticket-git-main-sakkayuta.vercel.app',
    'https://moneyticket-git-main-seai0520s-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
};

// デモ用電話番号の検証
function isDemoPhoneNumber(phone: string): boolean {
  const normalized = phone.replace(/[^\d]/g, '');
  return DEMO_CONFIG.phoneNumbers.includes(normalized);
}

// デモトークンの検証
async function validateDemoToken(token: string, supabase: any): Promise<boolean> {
  if (!token) return false;
  
  try {
    const { data, error } = await supabase
      .from('demo_sessions')
      .select('*')
      .eq('demo_token', token)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS設定
  const origin = req.headers.origin;
  if (origin && DEMO_CONFIG.allowedOrigins.some(allowed => 
    origin === allowed || origin.includes('vercel.app')
  )) {
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
    const { phoneNumber, code, otp, demoToken } = req.body;
    const otpCode = code || otp;
    
    if (!phoneNumber || !otpCode) {
      res.status(400).json({ error: '電話番号と認証コードが必要です' });
      return;
    }

    if (!demoToken) {
      return res.status(403).json({ 
        error: 'デモアクセストークンが必要です'
      });
    }

    // Supabase設定
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'デモサービスが利用できません'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // デモトークンの検証
    const isValidToken = await validateDemoToken(demoToken, supabase);
    if (!isValidToken) {
      return res.status(403).json({ 
        error: 'デモアクセストークンが無効または期限切れです'
      });
    }

    // 電話番号の正規化
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');

    // デモ用電話番号の検証
    if (!isDemoPhoneNumber(normalizedPhone)) {
      return res.status(400).json({ 
        error: 'デモ用電話番号を使用してください',
        validNumbers: DEMO_CONFIG.phoneNumbers.slice(0, 5)
      });
    }

    // デモ用OTPレコードを取得
    const { data: otpRecord, error: fetchError } = await supabase
      .from('demo_sms_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('demo_token', demoToken)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return res.status(400).json({ 
        error: 'デモ用認証コードが見つかりません。新しいコードを取得してください。' 
      });
    }

    // 有効期限チェック
    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ 
        error: '認証コードの有効期限が切れています。新しいコードを取得してください。' 
      });
    }

    // 試行回数チェック（デモでも5回まで）
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ 
        error: 'デモ用OTP入力回数の上限に達しました。新しいコードを取得してください。' 
      });
    }

    // OTPコードの検証（デモ用固定コード）
    if (otpCode !== DEMO_CONFIG.otpCode) {
      // 試行回数を増加
      await supabase
        .from('demo_sms_verifications')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({ 
        error: `認証コードが正しくありません。残り${remainingAttempts}回入力できます。デモ用コード: ${DEMO_CONFIG.otpCode}`,
        isDemo: true,
        correctCode: DEMO_CONFIG.otpCode
      });
    }

    // デモ用OTPを認証済みとしてマーク
    const { error: updateError } = await supabase
      .from('demo_sms_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Demo OTP update error:', updateError);
      return res.status(500).json({ 
        error: 'デモ用認証処理中にエラーが発生しました' 
      });
    }

    // デモセッションのアクティビティを更新
    await supabase
      .from('demo_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        verification_completed: true
      })
      .eq('demo_token', demoToken);

    // デモ用診断セッションレコードを作成
    const { data: demoSession, error: sessionError } = await supabase
      .from('demo_diagnosis_sessions')
      .insert({
        phone_number: normalizedPhone,
        demo_token: demoToken,
        sms_verified: true,
        created_at: new Date().toISOString(),
        session_data: {
          isDemo: true,
          demoPhone: normalizedPhone,
          verifiedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Demo diagnosis session creation error:', sessionError);
      // エラーでも認証は成功として扱う
    }

    // セキュリティヘッダー設定
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    res.status(200).json({ 
      success: true,
      isDemo: true,
      message: 'デモ用認証が完了しました',
      sessionId: demoSession?.id || null,
      demoInfo: {
        phoneNumber: normalizedPhone,
        verifiedAt: new Date().toISOString(),
        sessionType: 'demo'
      }
    });

  } catch (error: any) {
    console.error('Demo verify OTP error:', error);
    res.status(500).json({ 
      success: false,
      error: 'デモ用OTP検証に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}