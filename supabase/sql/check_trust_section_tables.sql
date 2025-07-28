-- SecurityTrustSection関連のテーブル構造を確認

-- 1. 既存のテーブル一覧を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%trust%' 
  OR table_name LIKE '%security%'
  OR table_name LIKE '%section%'
ORDER BY table_name;

-- 2. homepage_content_settingsテーブルの内容を確認（SecurityTrustSectionがここに含まれている可能性）
SELECT setting_key, setting_value 
FROM homepage_content_settings 
WHERE setting_key LIKE '%trust%' 
   OR setting_key LIKE '%security%'
   OR setting_key LIKE '%section%'
ORDER BY setting_key;

-- 3. 全ての設定キーを確認
SELECT DISTINCT setting_key 
FROM homepage_content_settings 
ORDER BY setting_key;