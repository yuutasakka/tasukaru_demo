-- 不足しているテーブルの作成（400エラー対応）

-- 1. homepage_content_settings テーブル
CREATE TABLE IF NOT EXISTS homepage_content_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_data JSONB,
  content_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシー（全員）
CREATE POLICY "Public read access" ON homepage_content_settings
  FOR SELECT
  USING (true);

-- 書き込みポリシー（サービスロールのみ）
CREATE POLICY "Service role write access" ON homepage_content_settings
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 初期データ挿入
INSERT INTO homepage_content_settings (setting_key, setting_data) VALUES
  ('header_data', '{"title": "AI ConnectX", "subtitle": "あなたの資産運用をAIが最適化"}'),
  ('footer_data', '{"copyright": "© 2024 AI ConnectX", "company": "AI ConnectX Inc."}'),
  ('main_visual_data', '{"title": "あなたの未来の資産を診断！", "subtitle": "14種類の投資商品からあなたに最適なプランをご提案"}'),
  ('first_consultation_offer', '{"enabled": true, "text": "初回相談無料"}'),
  ('reasons_to_choose', '{"reasons": ["AI分析", "専門家サポート", "安心保証"]}'),
  ('cta_button_config', '{"text": "無料診断を始める", "color": "blue"}')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. legal_links テーブル
CREATE TABLE IF NOT EXISTS legal_links (
  id SERIAL PRIMARY KEY,
  link_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE legal_links ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシー（全員）
CREATE POLICY "Public read access" ON legal_links
  FOR SELECT
  USING (true);

-- 書き込みポリシー（サービスロールのみ）
CREATE POLICY "Service role write access" ON legal_links
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 初期データ挿入
INSERT INTO legal_links (link_type, title, url, display_order) VALUES
  ('terms', '利用規約', '/terms', 1),
  ('privacy', 'プライバシーポリシー', '/privacy', 2),
  ('legal', '特定商取引法に基づく表記', '/legal', 3)
ON CONFLICT DO NOTHING;

-- 3. admin_settings テーブル
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Admin only access" ON admin_settings
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE username = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- 初期データ挿入
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
  ('testimonials', '{"items": []}', 'お客様の声'),
  ('site_maintenance', '{"enabled": false}', 'メンテナンスモード'),
  ('analytics_tracking', '{"enabled": true}', 'アナリティクス設定')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. admin_credentials テーブルの確認と初期管理者作成
DO $$
BEGIN
  -- テーブルが存在しない場合は作成
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_credentials') THEN
    CREATE TABLE admin_credentials (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone_number VARCHAR(20),
      backup_code VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      requires_password_change BOOLEAN DEFAULT false
    );

    -- RLSを有効化
    ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

    -- サービスロールのみアクセス可能
    CREATE POLICY "Service role only" ON admin_credentials
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;

  -- デフォルト管理者アカウントの作成（既存の場合はスキップ）
  INSERT INTO admin_credentials (
    username,
    password_hash,
    phone_number,
    backup_code,
    is_active
  ) VALUES (
    'admin',
    -- パスワード: Admin123! (本番環境では必ず変更してください)
    '$2a$10$X5WZQwZRYXjKqJ0LQ8vJFuMWC2mchUZGgCi2RTiozKVfByx6kPvZG',
    '+81000000000',
    'BACKUP-ADMIN-DEFAULT',
    true
  ) ON CONFLICT (username) DO NOTHING;
END $$;

-- 5. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_homepage_content_settings_key ON homepage_content_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_legal_links_type ON legal_links(link_type);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- 完了メッセージ
SELECT 'テーブル作成完了' as status;