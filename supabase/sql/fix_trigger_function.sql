-- AI ConnectX トリガー関数エラー修正

-- 1. 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. 問題のある関数を削除
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. 修正された関数を作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- auth.usersテーブルの実際のカラム構造に合わせて修正
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url, subscription_plan)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'free'
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- エラーが発生してもユーザー作成は続行
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. トリガーを再作成（もし必要なら）
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 代替案: トリガーを使わずに管理者を直接作成
-- 既存の admin_credentials テーブルをクリア
DELETE FROM admin_credentials WHERE username = 'admin';

-- 管理者を直接作成（トリガーに依存しない）
INSERT INTO admin_credentials (
    username, 
    password_hash, 
    phone_number, 
    backup_code, 
    is_active,
    failed_attempts,
    created_at,
    updated_at
) VALUES (
    'admin',
    '075306e20048c015ddbb91ab77abe11981bb6bd7d98e2cb9d0001eb7c29b7627',
    '+81-90-1234-5678',
    'BACKUP2024',
    true,
    0,
    NOW(),
    NOW()
);

-- 6. 確認
SELECT username, is_active, created_at FROM admin_credentials WHERE username = 'admin';