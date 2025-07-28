import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, phoneNumber, diagnosisData } = req.body;
    
    if (!email || !phoneNumber) {
      return res.status(400).json({ error: 'メールアドレスと電話番号が必要です' });
    }

    // メールアドレスの検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
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

    // ユーザーIDを取得
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // ダウンロードトークンを生成（URLセーフなランダム文字列）
    const downloadToken = crypto.randomBytes(32).toString('base64url');

    // メールアドレスとダウンロード情報を保存
    const { data: downloadData, error: saveError } = await supabase
      .from('email_downloads')
      .insert({
        user_id: user.id,
        phone_number: normalizedPhone,
        email: email.toLowerCase(),
        download_token: downloadToken,
        diagnosis_data: diagnosisData || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7日後
      })
      .select()
      .single();

    if (saveError) {
      return res.status(500).json({ 
        error: 'データ保存に失敗しました' 
      });
    }

    // ダウンロードURLを生成（クライアントサイドで処理）
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : origin || 'http://localhost:3000';
    
    // ダウンロード処理はクライアントサイドで実装
    const downloadUrl = `${baseUrl}/download/${downloadToken}`;

    res.status(200).json({ 
      success: true,
      downloadUrl,
      downloadToken,
      expiresAt: downloadData.expires_at,
      message: 'ダウンロードリンクが生成されました'
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'データ保存に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}