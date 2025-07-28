-- 既存のテーブルとポリシーを確認して修正するSQL

-- 1. 既存のregistration_requestsテーブルの状態を確認
-- このクエリで現在のテーブル構造を確認できます
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'registration_requests'
ORDER BY ordinal_position;

-- 2. 既存のポリシーを確認
SELECT polname, polcmd, polroles 
FROM pg_policy 
WHERE polrelid = 'public.registration_requests'::regclass;

-- 3. 既存のポリシーを削除（必要な場合）
DROP POLICY IF EXISTS "Anyone can create registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Anyone can check their own request" ON public.registration_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.registration_requests;

-- 4. admin_registrationsテーブルが存在しない場合のみ作成
-- （adminsテーブルへの参照を一時的に削除）
CREATE TABLE IF NOT EXISTS public.admin_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    reason TEXT,
    department VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(255), -- UUIDの代わりに文字列として保存
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 必要なインデックスを作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_admin_registrations_email ON public.admin_registrations(email);
CREATE INDEX IF NOT EXISTS idx_admin_registrations_status ON public.admin_registrations(status);

-- 6. RLSを有効化
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;

-- 7. 新しいポリシーを作成
CREATE POLICY "Anyone can read pending registrations" ON public.admin_registrations
    FOR SELECT
    TO public
    USING (status = 'pending');

CREATE POLICY "Public can insert registrations" ON public.admin_registrations
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 8. registration_requestsテーブルに新しいポリシーを作成
CREATE POLICY "Public can create registration requests" ON public.registration_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can check their own request" ON public.registration_requests
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated can manage all requests" ON public.registration_requests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 9. 権限を付与
GRANT ALL ON public.admin_registrations TO authenticated;
GRANT SELECT, INSERT ON public.admin_registrations TO anon;
GRANT ALL ON public.registration_requests TO authenticated;
GRANT INSERT, SELECT ON public.registration_requests TO anon;