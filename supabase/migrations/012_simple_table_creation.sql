-- シンプルなテーブル作成 - マイグレーション 012
-- エラーを避けるため段階的に作成

-- 1. homepage_content_settingsテーブル作成（シンプル版）
DROP TABLE IF EXISTS homepage_content_settings CASCADE;
CREATE TABLE homepage_content_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. admin_settingsテーブル作成（シンプル版）
DROP TABLE IF EXISTS admin_settings CASCADE;
CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 基本インデックス作成
CREATE INDEX idx_homepage_content_key ON homepage_content_settings(setting_key);
CREATE INDEX idx_admin_settings_key ON admin_settings(setting_key);

-- 4. RLS有効化（読み取り専用）
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 5. 読み取り専用ポリシー
CREATE POLICY "homepage_content_read_policy" ON homepage_content_settings FOR SELECT USING (true);
CREATE POLICY "admin_settings_read_policy" ON admin_settings FOR SELECT USING (true);

-- 6. 必要最小限のデータ挿入
INSERT INTO homepage_content_settings (setting_key, setting_data) VALUES 
('first_consultation_offer', '{"title": "初回相談無料", "description": "お気軽にご相談ください"}'),
('footer_data', '{"companyName": "AI ConnectX", "contact": {"phone": "0120-123-456"}}'),
('reasons_to_choose', '{"title": "選ばれる理由", "reasons": [{"title": "安心・安全", "description": "セキュリティ対策万全"}]}');

INSERT INTO admin_settings (setting_key, setting_value) VALUES 
('testimonials', '{"title": "お客様の声", "testimonials": [{"name": "田中様", "comment": "とても良いサービスでした"}]}');