-- 必要なテーブルが存在することを確認するマイグレーション

-- 1. diagnosis_resultsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS diagnosis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(255) NOT NULL,
    age_group VARCHAR(50),
    investment_experience VARCHAR(50),
    investment_purpose VARCHAR(50),
    monthly_investment VARCHAR(50),
    start_timing VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_phone ON diagnosis_results(phone_number);
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_created_at ON diagnosis_results(created_at);

-- 2. email_downloadsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS email_downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    download_token VARCHAR(255) UNIQUE NOT NULL,
    is_downloaded BOOLEAN DEFAULT false,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_email_downloads_token ON email_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_email_downloads_email ON email_downloads(email);
CREATE INDEX IF NOT EXISTS idx_email_downloads_phone ON email_downloads(phone_number);
CREATE INDEX IF NOT EXISTS idx_email_downloads_downloaded ON email_downloads(is_downloaded);

-- RLSを有効化
ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_downloads ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（diagnosis_results）
-- 管理者は全ての操作が可能
CREATE POLICY IF NOT EXISTS "Admin can manage diagnosis_results" ON diagnosis_results
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated')
    );

-- RLSポリシー（email_downloads）
-- 管理者は全ての操作が可能
CREATE POLICY IF NOT EXISTS "Admin can manage email_downloads" ON email_downloads
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated')
    );

-- 権限を付与
GRANT ALL ON diagnosis_results TO anon;
GRANT ALL ON diagnosis_results TO authenticated;
GRANT ALL ON diagnosis_results TO service_role;

GRANT ALL ON email_downloads TO anon;
GRANT ALL ON email_downloads TO authenticated;
GRANT ALL ON email_downloads TO service_role;

-- 更新時刻を自動更新するトリガー（存在しない場合のみ作成）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_diagnosis_results_updated_at') THEN
        CREATE TRIGGER update_diagnosis_results_updated_at BEFORE UPDATE
            ON diagnosis_results FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_downloads_updated_at') THEN
        CREATE TRIGGER update_email_downloads_updated_at BEFORE UPDATE
            ON email_downloads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END
$$;

-- 確認
SELECT 
    'Tables created/verified' as status,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnosis_results') as diagnosis_results_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'email_downloads') as email_downloads_exists;