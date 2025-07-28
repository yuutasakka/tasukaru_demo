import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 環境変数から公開可能な設定のみを返す
    const publicConfig = {
      supabaseUrl: process.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
      // 追加の公開設定があればここに追加
    };

    // キャッシュ制御
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ

    return res.status(200).json(publicConfig);
  } catch (error) {
    console.error('Error fetching public config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}