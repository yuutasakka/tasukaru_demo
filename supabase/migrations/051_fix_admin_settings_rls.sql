-- admin_settingsテーブルのRLSポリシーを修正
-- anonキーでもアクセスできるようにする

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Service role manage admin_settings" ON admin_settings;

-- admin_settingsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    setting_data JSONB, -- 互換性のため両方のカラムを用意
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLSを有効化
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 新しいポリシーを作成
-- 1. 読み取りは誰でも可能（公開設定のため）
CREATE POLICY "Public can read admin_settings" ON admin_settings
    FOR SELECT
    USING (true);

-- 2. 書き込み・更新・削除はservice_roleまたはanonキー（管理画面用）
CREATE POLICY "Authenticated can manage admin_settings" ON admin_settings
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated')
    );

-- 権限を付与
GRANT ALL ON admin_settings TO anon;
GRANT ALL ON admin_settings TO authenticated;
GRANT ALL ON admin_settings TO service_role;

-- testimonials設定が存在しない場合はデフォルトを挿入
INSERT INTO admin_settings (setting_key, setting_value, setting_data, description)
VALUES (
    'testimonials',
    '[]'::jsonb,
    '[]'::jsonb,
    'お客様の声の設定'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 確認
SELECT 
    'admin_settings policies created' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'admin_settings';