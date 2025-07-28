-- マイグレーション 015: APIクエリテスト

-- 1. 基本的なクエリテスト
SELECT * FROM homepage_content_settings WHERE setting_key = 'first_consultation_offer';
SELECT * FROM admin_settings WHERE setting_key = 'testimonials';

-- 2. 問題のあるクエリを修正版で実行
-- 元のエラー: "failed to parse filter (testimonials)"
-- 修正版: 正しいフィルタ形式

-- 3. テーブル権限確認
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('homepage_content_settings', 'admin_settings');

-- 4. 実際のデータ内容確認
SELECT 
    setting_key,
    CASE 
        WHEN setting_data IS NOT NULL THEN 'HAS_DATA'
        ELSE 'NO_DATA'
    END as data_status,
    title,
    active
FROM homepage_content_settings;

SELECT 
    setting_key,
    CASE 
        WHEN setting_value IS NOT NULL THEN 'HAS_DATA'
        ELSE 'NO_DATA'
    END as value_status,
    title,
    active
FROM admin_settings;