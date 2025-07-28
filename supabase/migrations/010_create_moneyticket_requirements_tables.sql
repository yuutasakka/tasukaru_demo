-- MoneyTicket 要件定義書準拠テーブル作成
-- 2024-12-19: SMS認証、診断セッション、プランナー管理テーブル

-- SMS認証テーブル（要件定義書 3.2 データベース設計準拠）
CREATE TABLE IF NOT EXISTS sms_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    failed_count INTEGER DEFAULT 0,
    send_count INTEGER DEFAULT 0,
    last_send_at TIMESTAMP WITH TIME ZONE,
    request_ip INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- インデックス
    CONSTRAINT sms_verification_phone_key UNIQUE (phone_number)
);

-- 診断セッションテーブル（既存テーブルに新しいカラムを追加）
-- 要件定義書準拠の新カラム追加
ALTER TABLE diagnosis_sessions 
ADD COLUMN IF NOT EXISTS age VARCHAR(20),
ADD COLUMN IF NOT EXISTS experience VARCHAR(20),
ADD COLUMN IF NOT EXISTS purpose VARCHAR(30),
ADD COLUMN IF NOT EXISTS amount VARCHAR(20),
ADD COLUMN IF NOT EXISTS timing VARCHAR(20),
ADD COLUMN IF NOT EXISTS prevent_redo BOOLEAN DEFAULT TRUE;

-- 診断セッションの制約追加
DO $$
BEGIN
    -- 制約が存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_age_values') THEN
        ALTER TABLE diagnosis_sessions ADD CONSTRAINT check_age_values 
        CHECK (age IS NULL OR age IN ('20s', '30s', '40s', '50s', '60s_plus'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_experience_values') THEN
        ALTER TABLE diagnosis_sessions ADD CONSTRAINT check_experience_values 
        CHECK (experience IS NULL OR experience IN ('beginner', 'basic', 'experienced'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_purpose_values') THEN
        ALTER TABLE diagnosis_sessions ADD CONSTRAINT check_purpose_values 
        CHECK (purpose IS NULL OR purpose IN ('education', 'housing', 'retirement', 'wealth'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_amount_values') THEN
        ALTER TABLE diagnosis_sessions ADD CONSTRAINT check_amount_values 
        CHECK (amount IS NULL OR amount IN ('under_10k', '10k_30k', '30k_50k', '50k_100k', 'over_100k'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_timing_values') THEN
        ALTER TABLE diagnosis_sessions ADD CONSTRAINT check_timing_values 
        CHECK (timing IS NULL OR timing IN ('now', 'within_month', 'carefully'));
    END IF;
END $$;

-- ファイナンシャルプランナーテーブル（要件定義書準拠）
CREATE TABLE IF NOT EXISTS financial_planners (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(150) DEFAULT 'ファイナンシャルプランナー',
    experience_years INTEGER DEFAULT 1,
    specialties TEXT[], -- 専門分野の配列
    bio TEXT,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CHECK (experience_years >= 0 AND experience_years <= 50),
    CHECK (display_order >= 0)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sms_verification_phone ON sms_verification(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_verification_expires_at ON sms_verification(expires_at);
CREATE INDEX IF NOT EXISTS idx_sms_verification_request_ip ON sms_verification(request_ip);
CREATE INDEX IF NOT EXISTS idx_sms_verification_created_at ON sms_verification(created_at);

CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_phone ON diagnosis_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_created_at ON diagnosis_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_sms_verified ON diagnosis_sessions(sms_verified);

CREATE INDEX IF NOT EXISTS idx_financial_planners_active ON financial_planners(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_planners_display_order ON financial_planners(display_order);

CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_age ON diagnosis_sessions(age);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_experience ON diagnosis_sessions(experience);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_purpose ON diagnosis_sessions(purpose);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_prevent_redo ON diagnosis_sessions(prevent_redo);

-- Row Level Security (RLS) 有効化
ALTER TABLE sms_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_planners ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定
-- SMS認証テーブル: service_roleまたは認証済みユーザーのみアクセス可
CREATE POLICY IF NOT EXISTS sms_verification_policy ON sms_verification
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- 診断セッションテーブル: service_roleまたは認証済みユーザーのみアクセス可
CREATE POLICY diagnosis_sessions_policy ON diagnosis_sessions
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- プランナーテーブル: 閲覧は全ユーザー可、編集は管理者のみ
CREATE POLICY financial_planners_read_policy ON financial_planners
    FOR SELECT USING (TRUE);

CREATE POLICY financial_planners_write_policy ON financial_planners
    FOR ALL USING (auth.role() = 'service_role');

-- 初期データ挿入: サンプルファイナンシャルプランナー
INSERT INTO financial_planners (
    name, 
    title, 
    experience_years, 
    specialties, 
    bio,
    phone_number, 
    email,
    display_order,
    is_active
) VALUES 
(
    '田中太郎', 
    'ファイナンシャルプランナー', 
    10, 
    ARRAY['資産形成', '老後資金', 'NISA・iDeCo'], 
    '10年の経験を持つファイナンシャルプランナーです。お客様の資産形成と老後資金計画をサポートしています。',
    '03-1234-5678', 
    'tanaka@example.com',
    1,
    TRUE
),
(
    '佐藤花子', 
    'ファイナンシャルプランナー', 
    8, 
    ARRAY['NISA・iDeCo', '教育資金', '住宅資金'], 
    'NISA・iDeCoの専門家として、教育資金や住宅資金の計画作りをお手伝いしています。',
    '03-5678-9012', 
    'sato@example.com',
    2,
    TRUE
),
(
    '山田次郎', 
    'シニアファイナンシャルプランナー', 
    15, 
    ARRAY['資産保全', '相続対策', '不動産投資'], 
    '15年の実績を持つシニアプランナーです。資産保全と相続対策を得意としています。',
    '03-9876-5432', 
    'yamada@example.com',
    3,
    TRUE
)
ON CONFLICT (phone_number) DO NOTHING;

-- トリガー関数: updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_financial_planners_updated_at 
    BEFORE UPDATE ON financial_planners 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 過去データのクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_sms_verification()
RETURNS void AS $$
BEGIN
    -- 24時間以上前の期限切れSMS認証記録を削除
    DELETE FROM sms_verification 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    -- 7日以上前の未認証診断セッションを削除
    DELETE FROM diagnosis_sessions 
    WHERE sms_verified = FALSE 
      AND created_at < NOW() - INTERVAL '7 days';
END;
$$ language 'plpgsql';

-- コメント追加
COMMENT ON TABLE sms_verification IS 'SMS認証管理テーブル - 要件定義書3.2準拠';
COMMENT ON TABLE diagnosis_sessions IS '診断セッション管理テーブル - 要件定義書3.2準拠';
COMMENT ON TABLE financial_planners IS 'ファイナンシャルプランナー管理テーブル - 要件定義書3.2準拠';

COMMENT ON COLUMN sms_verification.phone_number IS '電話番号（ハイフンなし11桁）';
COMMENT ON COLUMN sms_verification.otp_code IS '6桁OTP認証コード';
COMMENT ON COLUMN sms_verification.send_count IS '1時間あたり送信回数制限用';
COMMENT ON COLUMN sms_verification.failed_count IS '認証失敗回数（5回でIPブロック）';

COMMENT ON COLUMN diagnosis_sessions.age IS '年代（20s, 30s, 40s, 50s, 60s_plus）';
COMMENT ON COLUMN diagnosis_sessions.experience IS '投資経験（beginner, basic, experienced）';
COMMENT ON COLUMN diagnosis_sessions.purpose IS '投資目的（education, housing, retirement, wealth）';
COMMENT ON COLUMN diagnosis_sessions.amount IS '投資金額（under_10k, 10k_30k, 30k_50k, 50k_100k, over_100k）';
COMMENT ON COLUMN diagnosis_sessions.timing IS '開始時期（now, within_month, carefully）';
COMMENT ON COLUMN diagnosis_sessions.prevent_redo IS '再診断防止フラグ（SMS認証完了後にTRUE）'; 