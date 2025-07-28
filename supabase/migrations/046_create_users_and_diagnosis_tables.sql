-- usersテーブルとdiagnosis_resultsテーブルを作成

-- 1. usersテーブル
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_verified ON public.users(last_verified_at);

-- RLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ポリシー（サービスロールのみ書き込み可能）
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. diagnosis_resultsテーブル
CREATE TABLE IF NOT EXISTS public.diagnosis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    diagnosis_data JSONB NOT NULL,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_diagnosis_user_id ON public.diagnosis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_phone ON public.diagnosis_results(phone_number);
CREATE INDEX IF NOT EXISTS idx_diagnosis_session ON public.diagnosis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_created ON public.diagnosis_results(created_at);

-- RLSを有効化
ALTER TABLE public.diagnosis_results ENABLE ROW LEVEL SECURITY;

-- ポリシー（サービスロールのみ書き込み可能）
CREATE POLICY "Service role can manage diagnosis_results" ON public.diagnosis_results
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 3. 更新日時を自動更新するトリガー
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 既存のdiagnosis_sessionsデータを移行（オプション）
-- 注意：この部分は既存データがある場合のみ実行してください
DO $$
BEGIN
    -- diagnosis_sessionsテーブルが存在し、データがある場合
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnosis_sessions') THEN
        -- 認証済みのセッションデータをusersテーブルに移行
        INSERT INTO public.users (phone_number, last_verified_at, created_at, updated_at)
        SELECT DISTINCT 
            phone_number,
            verification_timestamp::timestamp with time zone,
            created_at,
            created_at
        FROM public.diagnosis_sessions
        WHERE sms_verified = true
        AND phone_number IS NOT NULL
        ON CONFLICT (phone_number) DO UPDATE
        SET last_verified_at = EXCLUDED.last_verified_at,
            updated_at = CURRENT_TIMESTAMP;

        -- 診断データをdiagnosis_resultsテーブルに移行
        INSERT INTO public.diagnosis_results (user_id, phone_number, diagnosis_data, session_id, created_at)
        SELECT 
            u.id,
            ds.phone_number,
            ds.diagnosis_answers,
            ds.session_id,
            ds.created_at
        FROM public.diagnosis_sessions ds
        JOIN public.users u ON u.phone_number = ds.phone_number
        WHERE ds.sms_verified = true
        AND ds.diagnosis_answers IS NOT NULL;

        RAISE NOTICE 'データ移行が完了しました';
    END IF;
END $$;

-- 5. 権限付与（必要に応じて）
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.diagnosis_results TO service_role;

-- 完了メッセージ
SELECT 'usersテーブルとdiagnosis_resultsテーブルの作成が完了しました' as status;