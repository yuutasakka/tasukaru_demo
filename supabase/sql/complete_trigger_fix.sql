-- AI ConnectX 完全トリガー修正 - エラー根本解決

-- 1. 全てのトリガーを確認して削除
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- auth.usersテーブルの全トリガーを削除
    FOR trigger_record IN 
        SELECT tgname, relname 
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'users' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_record.tgname);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
    END LOOP;
END $$;

-- 2. 問題のある関数を完全削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 3. user_profilesテーブルが存在するか確認し、必要に応じて作成
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- 4. RLSを無効化
ALTER TABLE IF EXISTS admin_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;

-- 5. テーブル権限を付与
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 6. 管理者アカウントをクリーンアップして再作成
DELETE FROM admin_credentials WHERE username = 'admin';

INSERT INTO admin_credentials (
    username, 
    password_hash, 
    phone_number, 
    backup_code, 
    is_active,
    failed_attempts,
    locked_until
) VALUES (
    'admin',
    '075306e20048c015ddbb91ab77abe11981bb6bd7d98e2cb9d0001eb7c29b7627',
    '+81-90-1234-5678',
    'BACKUP2024',
    true,
    0,
    NULL
);

-- 7. 確認クエリ
SELECT 
    username, 
    is_active, 
    failed_attempts,
    locked_until,
    created_at
FROM admin_credentials 
WHERE username = 'admin';

-- 8. トリガー確認（削除されているかチェック）
SELECT 
    tgname as trigger_name,
    relname as table_name
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
WHERE c.relname = 'users' 
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');