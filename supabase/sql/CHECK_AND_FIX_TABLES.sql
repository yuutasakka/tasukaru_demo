-- 既存のテーブルとポリシーをチェックして修正するためのSQL

-- ステップ1: 既存のテーブルを確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admins', 'admin_registrations', 'registration_requests');

-- ステップ2: registration_requestsテーブルのポリシーを一旦すべて削除
DO $$ 
BEGIN
    -- registration_requestsのポリシーを削除
    DROP POLICY IF EXISTS "Anyone can create registration requests" ON public.registration_requests;
    DROP POLICY IF EXISTS "Anyone can check their own request" ON public.registration_requests;
    DROP POLICY IF EXISTS "Admins can manage all requests" ON public.registration_requests;
    DROP POLICY IF EXISTS "Public can create registration requests" ON public.registration_requests;
    DROP POLICY IF EXISTS "Public can check their own request" ON public.registration_requests;
    DROP POLICY IF EXISTS "Authenticated can manage all requests" ON public.registration_requests;
    
    -- admin_registrationsのポリシーを削除
    DROP POLICY IF EXISTS "Anyone can read pending registrations" ON public.admin_registrations;
    DROP POLICY IF EXISTS "Admins can manage registrations" ON public.admin_registrations;
    DROP POLICY IF EXISTS "Public can insert registrations" ON public.admin_registrations;
EXCEPTION
    WHEN undefined_table THEN
        -- テーブルが存在しない場合は何もしない
        NULL;
END $$;

-- ステップ3: admin_registrationsテーブルを作成（存在しない場合）
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
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ステップ4: インデックスを作成
CREATE INDEX IF NOT EXISTS idx_admin_registrations_email ON public.admin_registrations(email);
CREATE INDEX IF NOT EXISTS idx_admin_registrations_status ON public.admin_registrations(status);

-- ステップ5: RLSを有効化
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;

-- ステップ6: 新しいポリシーを作成
-- admin_registrations用
CREATE POLICY "anon_can_insert_admin_registrations" ON public.admin_registrations
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "anon_can_select_admin_registrations" ON public.admin_registrations
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "authenticated_can_all_admin_registrations" ON public.admin_registrations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- registration_requests用（既存の場合）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registration_requests') THEN
        -- RLSを有効化
        ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
        
        -- ポリシーを作成
        CREATE POLICY "anon_can_insert_registration_requests" ON public.registration_requests
            FOR INSERT
            TO anon
            WITH CHECK (true);

        CREATE POLICY "anon_can_select_registration_requests" ON public.registration_requests
            FOR SELECT
            TO anon
            USING (true);

        CREATE POLICY "authenticated_can_all_registration_requests" ON public.registration_requests
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ステップ7: 権限を付与
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON public.admin_registrations TO authenticated;
GRANT SELECT, INSERT ON public.admin_registrations TO anon;

-- registration_requestsテーブルが存在する場合のみ権限付与
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registration_requests') THEN
        GRANT ALL ON public.registration_requests TO authenticated;
        GRANT INSERT, SELECT ON public.registration_requests TO anon;
    END IF;
END $$;