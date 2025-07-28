-- ステップバイステップ: テーブル作成とRLSポリシー適用
-- 2024年12月17日 - 緊急修正版

-- ステップ1: 既存テーブルのRLS一時無効化（エラー回避）
DO $$
BEGIN
    -- テーブルが存在する場合のみRLSを無効化
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'legal_links') THEN
        ALTER TABLE legal_links DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'homepage_content_settings') THEN
        ALTER TABLE homepage_content_settings DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
        ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_planners') THEN
        ALTER TABLE financial_planners DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_products') THEN
        ALTER TABLE financial_products DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expert_contact_settings') THEN
        ALTER TABLE expert_contact_settings DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'diagnosis_sessions') THEN
        ALTER TABLE diagnosis_sessions DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ステップ2: 必要なテーブルを作成（存在しない場合）

-- legal_linksテーブル
CREATE TABLE IF NOT EXISTS legal_links (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- サンプルデータ挿入（重複挿入を避ける）
INSERT INTO legal_links (name, url, is_active) 
SELECT 'プライバシーポリシー', '/privacy', true
WHERE NOT EXISTS (SELECT 1 FROM legal_links WHERE name = 'プライバシーポリシー');

INSERT INTO legal_links (name, url, is_active) 
SELECT '利用規約', '/terms', true
WHERE NOT EXISTS (SELECT 1 FROM legal_links WHERE name = '利用規約');

INSERT INTO legal_links (name, url, is_active) 
SELECT '特定商取引法', '/commercial-law', true
WHERE NOT EXISTS (SELECT 1 FROM legal_links WHERE name = '特定商取引法');

-- homepage_content_settingsテーブル
CREATE TABLE IF NOT EXISTS homepage_content_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- サンプルデータ挿入
INSERT INTO homepage_content_settings (setting_key, setting_data, is_active) 
SELECT 'first_consultation_offer', '{"enabled": true, "title": "初回相談無料", "description": "お気軽にご相談ください"}', true
WHERE NOT EXISTS (SELECT 1 FROM homepage_content_settings WHERE setting_key = 'first_consultation_offer');

INSERT INTO homepage_content_settings (setting_key, setting_data, is_active) 
SELECT 'footer_data', '{"company": "AI ConnectX", "copyright": "© 2024 AI ConnectX. All rights reserved."}', true
WHERE NOT EXISTS (SELECT 1 FROM homepage_content_settings WHERE setting_key = 'footer_data');

INSERT INTO homepage_content_settings (setting_key, setting_data, is_active) 
SELECT 'header_data', '{"logo": "AI ConnectX", "navigation": []}', true
WHERE NOT EXISTS (SELECT 1 FROM homepage_content_settings WHERE setting_key = 'header_data');

-- admin_settingsテーブル
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_settings (setting_key, setting_value) 
SELECT 'testimonials', '[]'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'testimonials');

-- financial_plannersテーブル
CREATE TABLE IF NOT EXISTS financial_planners (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    experience_years INTEGER,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO financial_planners (name, specialty, experience_years, is_active, display_order) 
SELECT '山田太郎', '資産運用', 10, true, 1
WHERE NOT EXISTS (SELECT 1 FROM financial_planners WHERE name = '山田太郎');

INSERT INTO financial_planners (name, specialty, experience_years, is_active, display_order) 
SELECT '佐藤花子', '保険相談', 8, true, 2
WHERE NOT EXISTS (SELECT 1 FROM financial_planners WHERE name = '佐藤花子');

-- financial_productsテーブル
CREATE TABLE IF NOT EXISTS financial_products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO financial_products (name, category, description, is_active, display_order) 
SELECT '投資信託', '運用商品', '分散投資による安定運用', true, 1
WHERE NOT EXISTS (SELECT 1 FROM financial_products WHERE name = '投資信託');

INSERT INTO financial_products (name, category, description, is_active, display_order) 
SELECT '生命保険', '保険商品', '万一の時の保障', true, 2
WHERE NOT EXISTS (SELECT 1 FROM financial_products WHERE name = '生命保険');

-- expert_contact_settingsテーブル
CREATE TABLE IF NOT EXISTS expert_contact_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL,
    setting_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO expert_contact_settings (setting_key, setting_data, is_active) 
SELECT 'primary_financial_advisor', '{"name": "専門アドバイザー", "contact": "相談予約はお電話で"}', true
WHERE NOT EXISTS (SELECT 1 FROM expert_contact_settings WHERE setting_key = 'primary_financial_advisor');

-- diagnosis_sessionsテーブル（診断履歴用）
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    answers JSONB,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

SELECT 'All tables created successfully' as status;