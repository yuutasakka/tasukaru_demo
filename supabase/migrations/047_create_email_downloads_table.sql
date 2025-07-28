-- メールアドレスとダウンロード管理テーブルを作成

CREATE TABLE IF NOT EXISTS public.email_downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    download_token VARCHAR(255) UNIQUE,
    diagnosis_data JSONB,
    is_downloaded BOOLEAN DEFAULT false,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_email_downloads_user ON public.email_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_downloads_email ON public.email_downloads(email);
CREATE INDEX IF NOT EXISTS idx_email_downloads_token ON public.email_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_email_downloads_expires ON public.email_downloads(expires_at);

-- RLSを有効化
ALTER TABLE public.email_downloads ENABLE ROW LEVEL SECURITY;

-- ポリシー（サービスロールのみ書き込み可能）
CREATE POLICY "Service role can manage email_downloads" ON public.email_downloads
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ダウンロードトークンによる読み取りを許可（匿名ユーザーも可）
CREATE POLICY "Anyone can read with valid token" ON public.email_downloads
    FOR SELECT
    USING (
        download_token IS NOT NULL 
        AND expires_at > CURRENT_TIMESTAMP
    );

-- 権限付与
GRANT ALL ON public.email_downloads TO service_role;
GRANT SELECT ON public.email_downloads TO anon;

-- 完了メッセージ
SELECT 'email_downloadsテーブルの作成が完了しました' as status;