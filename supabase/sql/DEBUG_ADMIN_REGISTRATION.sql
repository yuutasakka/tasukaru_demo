-- デバッグ用SQL: admin_registrationsテーブルの問題を調査

-- 1. テーブルの存在を確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_registrations'
) as table_exists;

-- 2. カラムの詳細を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'admin_registrations'
ORDER BY ordinal_position;

-- 3. 現在のRLSポリシーを確認
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'admin_registrations'
ORDER BY policyname;

-- 4. テスト挿入（実際のデータ形式をテスト）
-- このクエリを実行してエラーを確認
INSERT INTO public.admin_registrations (
    email,
    password_hash,
    full_name,
    phone_number,
    reason,
    department,
    role,
    status
) VALUES (
    'test@example.com',
    'dummy_hash',
    'テストユーザー',
    '+819012345678',
    'テスト理由',
    'テスト部門',
    'admin',
    'pending'
) RETURNING *;

-- 5. 挿入したテストデータを削除（必要に応じて）
-- DELETE FROM public.admin_registrations WHERE email = 'test@example.com';