-- マイグレーション 014: テーブル確認とPostgREST設定修正

-- 1. テーブル存在確認
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('homepage_content_settings', 'admin_settings');

-- 2. カラム確認
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('homepage_content_settings', 'admin_settings')
ORDER BY table_name, ordinal_position;

-- 3. データ確認
SELECT 'homepage_content_settings' as table_name, count(*) as row_count FROM homepage_content_settings
UNION ALL
SELECT 'admin_settings' as table_name, count(*) as row_count FROM admin_settings;

-- 4. 実際のデータ確認
SELECT setting_key, title FROM homepage_content_settings;
SELECT setting_key, title FROM admin_settings;

-- 5. RLS設定確認
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('homepage_content_settings', 'admin_settings');

-- 6. ポリシー確認
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd, 
    qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('homepage_content_settings', 'admin_settings');