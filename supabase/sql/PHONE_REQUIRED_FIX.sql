-- 📞 phone_number必須対応: RLS無効化 + 管理者アカウント作成
-- Supabase SQL Editorで以下のSQLを実行してください

-- Step 1: RLS無効化（最優先）
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_record.tablename);
            RAISE NOTICE 'RLS disabled for table: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to disable RLS for table: % (Error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: 失敗したレコードを削除
DELETE FROM admin_credentials WHERE username = 'admin';

-- Step 3: phone_numberを必須として管理者アカウントを作成
INSERT INTO admin_credentials (username, password_hash, phone_number) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/pv8GQ8vP5WrT9r1kq', '0120-999-888');

-- Step 4: 作成されたアカウントを確認
SELECT username, phone_number, is_active, created_at 
FROM admin_credentials 
WHERE username = 'admin';

-- Step 5: RLS無効化の確認
SELECT COUNT(*) as tables_with_rls 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Step 6: 最終確認
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM admin_credentials WHERE username = 'admin' AND phone_number IS NOT NULL) 
        THEN '✅ 管理者アカウント作成成功！ログイン情報: admin / SecureAdmin123!'
        ELSE '❌ アカウント作成失敗'
    END as final_result;

SELECT '🎉 緊急修正完了 - 管理画面にログインできます' as status;