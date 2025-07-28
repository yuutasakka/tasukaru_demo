import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// 管理者用統合API
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // エンドポイントの判定
  const { action } = req.query;

  try {
    switch (action) {
      case 'verify-password':
        return await handleVerifyPassword(req, res);
      case 'get-statistics':
        return await handleGetStatistics(req, res);
      case 'get-download-stats':
        return await handleGetDownloadStats(req, res);
      case 'get-duplicate-phones':
        return await handleGetDuplicatePhones(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// パスワード検証
async function handleVerifyPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
  }

  // Supabase設定
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 管理者情報を取得
    const { data: admin, error } = await supabase
      .from('admin_credentials')
      .select('password_hash')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // パスワード検証
    const isValid = await bcrypt.compare(password, admin.password_hash);

    return res.status(200).json({ success: isValid });
  } catch (error) {
    console.error('Password verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 統計情報取得
async function handleGetStatistics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Supabase設定
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 統計データを取得
    const [smsStats, userStats, sessionStats] = await Promise.all([
      supabase.from('sms_verifications').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('diagnosis_sessions').select('*', { count: 'exact', head: true })
    ]);

    return res.status(200).json({
      statistics: {
        totalSmsVerifications: smsStats.count || 0,
        totalUsers: userStats.count || 0,
        totalSessions: sessionStats.count || 0
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

// ダウンロード統計
async function handleGetDownloadStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabase
      .from('email_downloads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return res.status(200).json({ downloads: data || [] });
  } catch (error) {
    console.error('Download stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch download statistics' });
  }
}

// 重複電話番号
async function handleGetDuplicatePhones(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: duplicates, error } = await supabase.rpc('get_duplicate_phone_numbers');

    if (error) {
      throw error;
    }

    return res.status(200).json({ duplicates: duplicates || [] });
  } catch (error) {
    console.error('Duplicate phones error:', error);
    return res.status(500).json({ error: 'Failed to fetch duplicate phone numbers' });
  }
}