import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// デモ用設定
const DEMO_CONFIG = {
  phoneNumbers: [
    '09000000001', '09000000002', '09000000003', '09000000004', '09000000005',
    '09000000006', '09000000007', '09000000008', '09000000009', '09000000010'
  ],
  otpCode: '123456',
  sessionTimeout: 30 * 60 * 1000, // 30分
  maxConcurrentSessions: 50,
  allowedOrigins: [
    'https://moneyticket.vercel.app',
    'https://moneyticket-git-main-sakkayuta.vercel.app',
    'https://moneyticket-git-main-seai0520s-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
};

// デモトークンの生成
function generateDemoToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

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

// デモセッションの作成
async function createDemoSession(supabase: any, clientIP: string): Promise<string | null> {
  try {
    const demoToken = generateDemoToken();
    const expiresAt = new Date(Date.now() + DEMO_CONFIG.sessionTimeout);
    
    const { error } = await supabase
      .from('demo_sessions')
      .insert({
        demo_token: demoToken,
        client_ip: clientIP,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Demo session creation error:', error);
      return null;
    }
    
    return demoToken;
  } catch (error) {
    console.error('Demo session creation failed:', error);
    return null;
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
    const { phoneNumber, demoToken, requestDemoAccess } = req.body;
    
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

    // IPアドレス取得
    const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                    req.headers['x-real-ip']?.toString() || 
                    'unknown';

    // デモアクセス要求の場合
    if (requestDemoAccess === true) {
      // 同一IPからの同時セッション数チェック
      const { data: activeSessions } = await supabase
        .from('demo_sessions')
        .select('id')
        .eq('client_ip', clientIP)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());

      if (activeSessions && activeSessions.length >= 3) {
        return res.status(429).json({ 
          error: 'デモセッション数の上限に達しました。しばらく待ってからお試しください。' 
        });
      }

      // 新しいデモセッションを作成
      const newDemoToken = await createDemoSession(supabase, clientIP);
      
      if (!newDemoToken) {
        return res.status(500).json({ 
          error: 'デモセッションの作成に失敗しました' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        demoToken: newDemoToken,
        message: 'デモアクセスが承認されました',
        instructions: {
          phoneNumbers: DEMO_CONFIG.phoneNumbers.slice(0, 5), // 最初の5つだけ表示
          otpCode: DEMO_CONFIG.otpCode,
          sessionTimeout: '30分'
        }
      });
    }

    // 通常のデモOTP送信処理
    if (!phoneNumber) {
      return res.status(400).json({ error: '電話番号が必要です' });
    }

    // デモトークンの検証
    if (!demoToken) {
      return res.status(403).json({ 
        error: 'デモアクセストークンが必要です。デモアクセスを要求してください。'
      });
    }

    const isValidToken = await validateDemoToken(demoToken, supabase);
    if (!isValidToken) {
      return res.status(403).json({ 
        error: 'デモアクセストークンが無効または期限切れです。新しいデモアクセスを要求してください。'
      });
    }

    // 電話番号の正規化
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');

    // デモ用電話番号の検証
    if (!isDemoPhoneNumber(normalizedPhone)) {
      return res.status(400).json({ 
        error: 'デモ用電話番号を使用してください（例: 090-0000-0001）',
        validNumbers: DEMO_CONFIG.phoneNumbers.slice(0, 5)
      });
    }

    // デモ用レート制限（1分間に3回まで）
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from('demo_sms_verifications')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('demo_token', demoToken)
      .gte('created_at', oneMinuteAgo);

    if (recentAttempts && recentAttempts.length >= 3) {
      return res.status(429).json({ 
        error: 'デモ用SMS送信回数の上限に達しました。1分後にお試しください。' 
      });
    }

    // 既存のデモOTPを削除
    await supabase
      .from('demo_sms_verifications')
      .delete()
      .eq('phone_number', normalizedPhone)
      .eq('demo_token', demoToken)
      .eq('is_verified', false);

    // デモ用OTPレコードを作成（5分間有効）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const { error: saveError } = await supabase
      .from('demo_sms_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: DEMO_CONFIG.otpCode,
        demo_token: demoToken,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_verified: false,
        request_ip: clientIP,
        created_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('Demo OTP save error:', saveError);
      return res.status(500).json({ 
        error: 'デモ用OTP保存に失敗しました' 
      });
    }

    // デモセッションのアクティビティを更新
    await supabase
      .from('demo_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        activity_count: supabase.rpc('increment_activity_count', { session_token: demoToken })
      })
      .eq('demo_token', demoToken);

    // セキュリティヘッダー設定
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    res.status(200).json({ 
      success: true,
      isDemo: true,
      message: `デモ用認証コードを準備しました。コード: ${DEMO_CONFIG.otpCode}`,
      demoInstructions: {
        otpCode: DEMO_CONFIG.otpCode,
        validFor: '5分間',
        note: 'これはデモ環境です。実際のSMSは送信されません。'
      }
    });

  } catch (error: any) {
    console.error('Demo SMS API error:', error);
    res.status(500).json({
      error: 'デモ用SMS送信に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}