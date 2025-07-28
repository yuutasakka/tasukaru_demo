-- 安全なテーブル作成/修正スクリプト
-- 既存のテーブルを壊さずに必要なテーブルとカラムを追加

-- 1. homepage_content_settings テーブル
DO $$
BEGIN
  -- テーブルが存在しない場合は作成
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homepage_content_settings') THEN
    CREATE TABLE homepage_content_settings (
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
  END IF;

  -- 必要なカラムが存在しない場合は追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homepage_content_settings' AND column_name = 'setting_data') THEN
    ALTER TABLE homepage_content_settings ADD COLUMN setting_data JSONB;
  END IF;
END $$;

-- 初期データ挿入（存在しない場合のみ）
INSERT INTO homepage_content_settings (setting_key, setting_data) VALUES
  ('header_data', '{"title": "AI ConnectX", "subtitle": "あなたの資産運用をAIが最適化"}'),
  ('footer_data', '{"copyright": "© 2024 AI ConnectX", "companyInfo": "AI ConnectX株式会社", "contactInfo": "お問い合わせ：info@ai-conectx.com", "siteName": "AI ConnectX", "description": "AIを活用した最適な資産運用プランをご提案します"}'),
  ('main_visual_data', '{"title": "あなたの未来の資産を診断！", "subtitle": "14種類の投資商品からあなたに最適なプランをご提案"}'),
  ('first_consultation_offer', '{"enabled": true, "text": "初回相談無料"}'),
  ('reasons_to_choose', '{"reasons": ["AI分析", "専門家サポート", "安心保証"]}')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. legal_links テーブル
DO $$
BEGIN
  -- テーブルが存在しない場合は作成
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legal_links') THEN
    CREATE TABLE legal_links (
      id SERIAL PRIMARY KEY,
      link_type VARCHAR(50) NOT NULL UNIQUE,
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
  ELSE
    -- 既存のテーブルにdisplay_orderカラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_links' AND column_name = 'display_order') THEN
      ALTER TABLE legal_links ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
    
    -- link_typeにユニーク制約を追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'legal_links' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%link_type%') THEN
      ALTER TABLE legal_links ADD CONSTRAINT legal_links_link_type_key UNIQUE (link_type);
    END IF;
  END IF;
END $$;

-- デフォルトデータの追加（存在しない場合のみ）
INSERT INTO legal_links (link_type, title, url, display_order, is_active) VALUES
  ('privacy_policy', 'プライバシーポリシー', '/privacy', 1, true),
  ('terms_of_service', '利用規約', '/terms', 2, true),
  ('specified_commercial_transactions', '特定商取引法', '/scta', 3, true),
  ('company_info', '会社概要', '/company', 4, true)
ON CONFLICT (link_type) DO UPDATE 
SET 
  title = EXCLUDED.title,
  url = EXCLUDED.url,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 3. admin_settings テーブル
DO $$
BEGIN
  -- テーブルが存在しない場合は作成
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
    CREATE TABLE admin_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_data JSONB,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- RLSを有効化
    ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

    -- 読み取り専用ポリシー（全員）
    CREATE POLICY "Public read access" ON admin_settings
      FOR SELECT
      USING (true);
  ELSE
    -- 既存のテーブルに必要なカラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_settings' AND column_name = 'setting_data') THEN
      ALTER TABLE admin_settings ADD COLUMN setting_data JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_settings' AND column_name = 'setting_value') THEN
      ALTER TABLE admin_settings ADD COLUMN setting_value TEXT;
    END IF;
  END IF;
END $$;

-- 初期データ挿入（存在しない場合のみ）
INSERT INTO admin_settings (setting_key, setting_data, description) VALUES
  ('testimonials', '{"items": []}', 'お客様の声'),
  ('financial_products', '{"items": []}', '金融商品リスト'),
  ('tracking_scripts', '{"scripts": []}', 'トラッキングスクリプト')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_homepage_content_settings_key ON homepage_content_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_legal_links_type ON legal_links(link_type);
CREATE INDEX IF NOT EXISTS idx_legal_links_display_order ON legal_links(display_order);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- 5. データの整合性チェック
DO $$
DECLARE
  table_count INTEGER;
  data_count INTEGER;
BEGIN
  -- テーブル数の確認
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_name IN ('homepage_content_settings', 'legal_links', 'admin_settings');
  
  -- データ数の確認
  SELECT 
    (SELECT COUNT(*) FROM homepage_content_settings) +
    (SELECT COUNT(*) FROM legal_links) +
    (SELECT COUNT(*) FROM admin_settings) 
  INTO data_count;
  
  RAISE NOTICE 'テーブル作成完了: % テーブル, % レコード', table_count, data_count;
END $$;

-- 完了メッセージ
SELECT 
  'すべてのテーブルが正常に作成/更新されました' as status,
  (SELECT COUNT(*) FROM homepage_content_settings) as homepage_settings_count,
  (SELECT COUNT(*) FROM legal_links) as legal_links_count,
  (SELECT COUNT(*) FROM admin_settings) as admin_settings_count;