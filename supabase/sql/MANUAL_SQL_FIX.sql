-- 手動実行用SQL: 400エラー修正
-- Supabase Dashboard → SQL Editor で実行してください

-- 1. 既存テーブルを削除（エラーを避けるため）
DROP TABLE IF EXISTS homepage_content_settings CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;

-- 2. homepage_content_settingsテーブル作成
CREATE TABLE homepage_content_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. admin_settingsテーブル作成
CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. RLS有効化
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 5. 読み取り権限付与
CREATE POLICY "homepage_content_read_policy" ON homepage_content_settings FOR SELECT USING (true);
CREATE POLICY "admin_settings_read_policy" ON admin_settings FOR SELECT USING (true);

-- 6. 必要データ挿入
INSERT INTO homepage_content_settings (setting_key, setting_data) VALUES 
('first_consultation_offer', '{"title": "初回相談無料キャンペーン", "description": "資産運用のプロが最適なプランをご提案します"}'),
('footer_data', '{"companyName": "AI ConnectX", "contact": {"phone": "0120-123-456", "email": "info@aiconectx.com"}}'),
('reasons_to_choose', '{"title": "AI ConnectXが選ばれる理由", "reasons": [{"title": "安心・安全", "description": "銀行レベルのセキュリティ"}]}');

INSERT INTO admin_settings (setting_key, setting_value) VALUES 
('testimonials', '{"title": "お客様の声", "testimonials": [{"name": "田中様", "comment": "丁寧なサポートで安心して投資を始められました", "rating": 5}]}');