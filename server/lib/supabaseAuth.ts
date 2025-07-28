// サーバーサイド専用認証ライブラリ
import { createClient } from '@supabase/supabase-js';

// 環境変数チェック（サーバーサイドでのみ実行）
if (typeof window === 'undefined') {
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  }
}

// サーバーサイド専用クライアント（SERVICE_ROLE_KEY使用）
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// パブリッククライアント（ANON_KEY使用）
const supabasePublic = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export { supabaseAdmin, supabasePublic };