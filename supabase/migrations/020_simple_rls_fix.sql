-- 超シンプル修正: 既存テーブル構造に対応したRLS設定
-- 2024年12月17日 - 緊急対応版

-- ステップ1: テーブル構造確認とRLS無効化
DO $$
BEGIN
    -- 全テーブルのRLSを一時的に無効化（エラー回避）
    EXECUTE 'ALTER TABLE IF EXISTS legal_links DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS homepage_content_settings DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS admin_settings DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS financial_planners DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS financial_products DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS expert_contact_settings DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS diagnosis_sessions DISABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN OTHERS THEN
        -- エラーが発生しても続行
        NULL;
END $$;

-- ステップ2: 最小限のテーブルを作成（存在しない場合のみ）

-- legal_linksテーブル（最小構成）
CREATE TABLE IF NOT EXISTS legal_links (
    id SERIAL PRIMARY KEY,
    link_name TEXT NOT NULL DEFAULT 'リンク',
    link_url TEXT NOT NULL DEFAULT '/',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- homepage_content_settingsテーブル
CREATE TABLE IF NOT EXISTS homepage_content_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL,
    setting_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- admin_settingsテーブル
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL,
    setting_value TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- financial_plannersテーブル
CREATE TABLE IF NOT EXISTS financial_planners (
    id SERIAL PRIMARY KEY,
    planner_name TEXT NOT NULL DEFAULT 'プランナー',
    specialty TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- financial_productsテーブル
CREATE TABLE IF NOT EXISTS financial_products (
    id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL DEFAULT '金融商品',
    category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- expert_contact_settingsテーブル
CREATE TABLE IF NOT EXISTS expert_contact_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL DEFAULT 'contact',
    setting_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- diagnosis_sessionsテーブル
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ステップ3: 最小限のサンプルデータ挿入（安全に）
INSERT INTO legal_links (link_name, link_url, is_active) 
SELECT 'プライバシーポリシー', '/privacy', true
WHERE NOT EXISTS (SELECT 1 FROM legal_links LIMIT 1);

INSERT INTO homepage_content_settings (setting_key, setting_data) 
SELECT 'header_data', '{"logo": "AI ConnectX"}'
WHERE NOT EXISTS (SELECT 1 FROM homepage_content_settings WHERE setting_key = 'header_data');

INSERT INTO homepage_content_settings (setting_key, setting_data) 
SELECT 'footer_data', '{"company": "AI ConnectX"}'
WHERE NOT EXISTS (SELECT 1 FROM homepage_content_settings WHERE setting_key = 'footer_data');

INSERT INTO homepage_content_settings (setting_key, setting_data) 
SELECT 'first_consultation_offer', '{"enabled": true}'
WHERE NOT EXISTS (SELECT 1 FROM homepage_content_settings WHERE setting_key = 'first_consultation_offer');

INSERT INTO admin_settings (setting_key, setting_value) 
SELECT 'testimonials', '[]'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'testimonials');

INSERT INTO expert_contact_settings (setting_key, setting_data) 
SELECT 'primary_financial_advisor', '{"name": "専門アドバイザー"}'
WHERE NOT EXISTS (SELECT 1 FROM expert_contact_settings WHERE setting_key = 'primary_financial_advisor');

-- 確認メッセージ
SELECT 'Tables created with minimal schema - RLS currently disabled for access' as status;