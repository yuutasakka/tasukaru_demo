-- AI ConnectX 代替修正方法 - DELETE使用

-- 1. トリガー削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. RLS無効化
ALTER TABLE admin_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sms_verification DISABLE ROW LEVEL SECURITY;

-- 3. DELETEを使用して安全にクリア
DELETE FROM admin_sms_verification;
DELETE FROM admin_login_attempts;
DELETE FROM admin_credentials;

-- 4. 管理者を作成
INSERT INTO admin_credentials (
    username, 
    password_hash, 
    phone_number, 
    backup_code, 
    is_active
) VALUES (
    'admin',
    '075306e20048c015ddbb91ab77abe11981bb6bd7d98e2cb9d0001eb7c29b7627',
    '+81-90-1234-5678',
    'BACKUP2024',
    true
);

-- 5. 確認
SELECT username, is_active, created_at FROM admin_credentials;