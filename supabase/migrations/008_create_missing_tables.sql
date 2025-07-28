-- MoneyTicket 不足テーブル作成SQL - マイグレーション 008
-- 管理システムに必要な追加テーブルを作成

-- 1. admin_settingsテーブル（管理者設定用）
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_data JSONB,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- admin_settingsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_active ON admin_settings(is_active);

-- 2. expert_contact_settingsテーブル（専門家連絡先用）
CREATE TABLE IF NOT EXISTS expert_contact_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    expert_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    business_hours VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- expert_contact_settingsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_expert_contact_key ON expert_contact_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_expert_contact_active ON expert_contact_settings(is_active);

-- 3. financial_plannersテーブル（ファイナンシャルプランナー情報用）
CREATE TABLE IF NOT EXISTS financial_planners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    experience_years INTEGER,
    specialties TEXT[],
    profile_image_url TEXT,
    bio TEXT NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    certifications TEXT[],
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- financial_plannersテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_financial_planners_active ON financial_planners(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_planners_order ON financial_planners(display_order);

-- Row Level Security (RLS) の有効化
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_planners ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー作成（匿名ユーザーは読み取りのみ、認証済みユーザーは全操作可能）
-- admin_settings
CREATE POLICY "admin_settings_read_policy" ON admin_settings
    FOR SELECT USING (true);

CREATE POLICY "admin_settings_write_policy" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- expert_contact_settings  
CREATE POLICY "expert_contact_read_policy" ON expert_contact_settings
    FOR SELECT USING (is_active = true);

CREATE POLICY "expert_contact_write_policy" ON expert_contact_settings
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- financial_planners
CREATE POLICY "financial_planners_read_policy" ON financial_planners
    FOR SELECT USING (is_active = true);

CREATE POLICY "financial_planners_write_policy" ON financial_planners
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 初期データの挿入
-- 1. 専門家連絡先のデフォルトデータ
INSERT INTO expert_contact_settings (
    setting_key,
    expert_name,
    phone_number,
    email,
    business_hours,
    description
) VALUES (
    'primary_financial_advisor',
    'AI ConnectX専門アドバイザー',
    '0120-123-456',
    'advisor@moneyticket.co.jp',
    '平日 9:00-18:00',
    'AI ConnectXの認定ファイナンシャルプランナーが、お客様の資産運用に関するご相談を承ります。'
) ON CONFLICT (setting_key) DO NOTHING;

-- 2. サンプルファイナンシャルプランナー
INSERT INTO financial_planners (
    name,
    title,
    experience_years,
    specialties,
    bio,
    phone_number,
    email,
    certifications,
    display_order
) VALUES 
(
    '田中 太郎',
    'シニアファイナンシャルプランナー',
    10,
    ARRAY['資産運用', '保険設計', '税務相談'],
    '10年以上の経験を持つファイナンシャルプランナーとして、数多くのお客様の資産形成をサポートしてまいりました。',
    '03-1234-5678',
    'tanaka@moneyticket.co.jp',
    ARRAY['CFP®', '1級ファイナンシャル・プランニング技能士'],
    1
),
(
    '佐藤 花子',
    'ファイナンシャルプランナー',
    7,
    ARRAY['住宅ローン', '教育資金', 'ライフプランニング'],
    '特に住宅購入や教育資金の準備に関するご相談を得意としております。お客様のライフスタイルに合わせた最適なプランをご提案いたします。',
    '03-1234-5679',
    'sato@moneyticket.co.jp',
    ARRAY['AFP', '2級ファイナンシャル・プランニング技能士'],
    2
);

-- 3. 管理者設定の初期データ
INSERT INTO admin_settings (
    setting_key,
    setting_data,
    description
) VALUES 
(
    'testimonials',
    '[]'::jsonb,
    'お客様の声データ'
),
(
    'notification_settings',
    '{
        "email": {"enabled": false, "smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpPassword": ""},
        "slack": {"enabled": false, "webhookUrl": ""},
        "line": {"enabled": false, "accessToken": ""},
        "chatwork": {"enabled": false, "apiToken": "", "roomId": ""}
    }'::jsonb,
    '通知設定'
) ON CONFLICT (setting_key) DO NOTHING;

-- 更新トリガー関数の作成（既存の場合は更新）
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新トリガーの設定
DROP TRIGGER IF EXISTS admin_settings_update_trigger ON admin_settings;
CREATE TRIGGER admin_settings_update_trigger
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

DROP TRIGGER IF EXISTS expert_contact_update_trigger ON expert_contact_settings;
CREATE TRIGGER expert_contact_update_trigger
    BEFORE UPDATE ON expert_contact_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

DROP TRIGGER IF EXISTS financial_planners_update_trigger ON financial_planners;
CREATE TRIGGER financial_planners_update_trigger
    BEFORE UPDATE ON financial_planners
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time(); 