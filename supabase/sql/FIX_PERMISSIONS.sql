-- テーブルは存在するので、権限とRLSポリシーを修正します

-- 1. 現在のRLSポリシーを確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('admin_registrations', 'registration_requests', 'admins')
ORDER BY tablename, policyname;

-- 2. admin_registrationsテーブルのRLSとポリシーを再設定
-- RLSを一度無効にしてから再度有効にする
ALTER TABLE public.admin_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Anyone can read pending registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "Public can insert registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "anon_can_insert_admin_registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "anon_can_select_admin_registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "authenticated_can_all_admin_registrations" ON public.admin_registrations;

-- 新しいポリシーを作成（シンプルに）
-- anonユーザーが挿入できるようにする
CREATE POLICY "enable_insert_for_anon" ON public.admin_registrations
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- anonユーザーが自分のメールアドレスで検索できるようにする
CREATE POLICY "enable_select_for_anon" ON public.admin_registrations
    FOR SELECT
    TO anon
    USING (true);

-- 認証済みユーザーはすべての操作が可能
CREATE POLICY "enable_all_for_authenticated" ON public.admin_registrations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. 権限を再設定
REVOKE ALL ON public.admin_registrations FROM anon;
REVOKE ALL ON public.admin_registrations FROM authenticated;

GRANT SELECT, INSERT ON public.admin_registrations TO anon;
GRANT ALL ON public.admin_registrations TO authenticated;

-- 4. registration_requestsテーブルも同様に修正
ALTER TABLE public.registration_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can create registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Anyone can check their own request" ON public.registration_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Public can create registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Public can check their own request" ON public.registration_requests;
DROP POLICY IF EXISTS "Authenticated can manage all requests" ON public.registration_requests;
DROP POLICY IF EXISTS "anon_can_insert_registration_requests" ON public.registration_requests;
DROP POLICY IF EXISTS "anon_can_select_registration_requests" ON public.registration_requests;
DROP POLICY IF EXISTS "authenticated_can_all_registration_requests" ON public.registration_requests;

-- 新しいポリシーを作成
CREATE POLICY "enable_insert_for_anon_reg" ON public.registration_requests
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "enable_select_for_anon_reg" ON public.registration_requests
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "enable_all_for_authenticated_reg" ON public.registration_requests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 権限を再設定
REVOKE ALL ON public.registration_requests FROM anon;
REVOKE ALL ON public.registration_requests FROM authenticated;

GRANT SELECT, INSERT ON public.registration_requests TO anon;
GRANT ALL ON public.registration_requests TO authenticated;

-- 5. スキーマレベルの権限も確認
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 6. テーブルの構造を確認（カラムが正しいか）
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'admin_registrations'
ORDER BY ordinal_position;