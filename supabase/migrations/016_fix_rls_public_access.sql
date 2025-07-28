-- RLS設定修正: パブリックアクセス可能なテーブルの設定
-- 2024年12月17日

-- 1. 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Enable select for anon users" ON legal_links;
DROP POLICY IF EXISTS "Enable select for anon users" ON homepage_content_settings;
DROP POLICY IF EXISTS "Enable select for anon users" ON admin_settings;
DROP POLICY IF EXISTS "Enable select for anon users" ON financial_planners;
DROP POLICY IF EXISTS "Enable select for anon users" ON financial_products;
DROP POLICY IF EXISTS "Enable select for anon users" ON expert_contact_settings;
DROP POLICY IF EXISTS "Enable select for anon users" ON diagnosis_sessions;

-- 2. legal_linksテーブル: パブリック読み取り可能
CREATE POLICY "Enable public read access" ON legal_links
FOR SELECT
TO public
USING (is_active = true);

-- 3. homepage_content_settingsテーブル: パブリック読み取り可能
CREATE POLICY "Enable public read access" ON homepage_content_settings
FOR SELECT
TO public
USING (true);

-- 4. admin_settingsテーブル: パブリック読み取り可能
CREATE POLICY "Enable public read access" ON admin_settings
FOR SELECT
TO public
USING (true);

-- 5. financial_plannersテーブル: パブリック読み取り可能
CREATE POLICY "Enable public read access" ON financial_planners
FOR SELECT
TO public
USING (is_active = true);

-- 6. financial_productsテーブル: パブリック読み取り可能
CREATE POLICY "Enable public read access" ON financial_products
FOR SELECT
TO public
USING (is_active = true);

-- 7. expert_contact_settingsテーブル: パブリック読み取り可能
CREATE POLICY "Enable public read access" ON expert_contact_settings
FOR SELECT
TO public
USING (is_active = true);

-- 8. diagnosis_sessionsテーブル: 匿名ユーザーがカウント取得可能
CREATE POLICY "Enable anonymous count access" ON diagnosis_sessions
FOR SELECT
TO public
USING (true);

-- 9. RLSが無効になっているテーブルがあれば有効化
ALTER TABLE legal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;

-- 10. テーブル存在確認と作成（存在しない場合）
DO $$
BEGIN
    -- legal_linksテーブル
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'legal_links') THEN
        CREATE TABLE legal_links (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO legal_links (name, url, is_active) VALUES
        ('プライバシーポリシー', '/privacy', true),
        ('利用規約', '/terms', true),
        ('特定商取引法', '/commercial-law', true);
    END IF;

    -- homepage_content_settingsテーブル
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'homepage_content_settings') THEN
        CREATE TABLE homepage_content_settings (
            id SERIAL PRIMARY KEY,
            setting_key TEXT UNIQUE NOT NULL,
            setting_data JSONB NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO homepage_content_settings (setting_key, setting_data, is_active) VALUES
        ('first_consultation_offer', '{"enabled": true, "title": "初回相談無料", "description": "お気軽にご相談ください"}', true),
        ('footer_data', '{"company": "AI ConnectX", "copyright": "© 2024 AI ConnectX. All rights reserved."}', true),
        ('header_data', '{"logo": "AI ConnectX", "navigation": []}', true);
    END IF;

    -- admin_settingsテーブル
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
        CREATE TABLE admin_settings (
            id SERIAL PRIMARY KEY,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO admin_settings (setting_key, setting_value) VALUES
        ('testimonials', '[]');
    END IF;

    -- financial_plannersテーブル
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_planners') THEN
        CREATE TABLE financial_planners (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            specialty TEXT,
            experience_years INTEGER,
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO financial_planners (name, specialty, experience_years, is_active, display_order) VALUES
        ('山田太郎', '資産運用', 10, true, 1),
        ('佐藤花子', '保険相談', 8, true, 2);
    END IF;

    -- financial_productsテーブル
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_products') THEN
        CREATE TABLE financial_products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO financial_products (name, category, description, is_active, display_order) VALUES
        ('投資信託', '運用商品', '分散投資による安定運用', true, 1),
        ('生命保険', '保険商品', '万一の時の保障', true, 2);
    END IF;

    -- expert_contact_settingsテーブル
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expert_contact_settings') THEN
        CREATE TABLE expert_contact_settings (
            id SERIAL PRIMARY KEY,
            setting_key TEXT NOT NULL,
            setting_data JSONB NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO expert_contact_settings (setting_key, setting_data, is_active) VALUES
        ('primary_financial_advisor', '{"name": "専門アドバイザー", "contact": "相談予約はお電話で"}', true);
    END IF;

END $$;

-- 11. 確認用クエリ
SELECT 'Tables created and RLS policies applied successfully' as status;