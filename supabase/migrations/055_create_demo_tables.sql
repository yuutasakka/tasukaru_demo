-- デモ用テーブル作成マイグレーション
-- 2024-12-19: セキュリティを保ったデモ環境用テーブル

-- デモセッション管理テーブル
CREATE TABLE IF NOT EXISTS demo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_token VARCHAR(64) NOT NULL UNIQUE,
    client_ip INET NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activity_count INTEGER DEFAULT 0,
    verification_completed BOOLEAN DEFAULT FALSE,
    
    -- インデックス用制約
    CONSTRAINT demo_sessions_token_key UNIQUE (demo_token)
);

-- デモ用SMS認証テーブル
CREATE TABLE IF NOT EXISTS demo_sms_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    demo_token VARCHAR(64) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    request_ip INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- 外部キー制約
    CONSTRAINT fk_demo_sms_session 
        FOREIGN KEY (demo_token) 
        REFERENCES demo_sessions(demo_token) 
        ON DELETE CASCADE,
    
    -- 複合ユニーク制約（同一セッション内で電話番号の重複を防ぐ）
    CONSTRAINT demo_sms_phone_token_unique 
        UNIQUE (phone_number, demo_token, is_verified)
);

-- デモ用診断セッションテーブル
CREATE TABLE IF NOT EXISTS demo_diagnosis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    demo_token VARCHAR(64) NOT NULL,
    sms_verified BOOLEAN DEFAULT FALSE,
    session_data JSONB,
    diagnosis_answers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外部キー制約
    CONSTRAINT fk_demo_diagnosis_session 
        FOREIGN KEY (demo_token) 
        REFERENCES demo_sessions(demo_token) 
        ON DELETE CASCADE,
    
    -- 複合ユニーク制約
    CONSTRAINT demo_diagnosis_phone_token_unique 
        UNIQUE (phone_number, demo_token)
);

-- デモアクセスログテーブル（監査用）
CREATE TABLE IF NOT EXISTS demo_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_token VARCHAR(64),
    client_ip INET NOT NULL,
    user_agent TEXT,
    action VARCHAR(50) NOT NULL, -- 'session_created', 'sms_sent', 'otp_verified', etc.
    request_data JSONB,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- インデックス
    INDEX idx_demo_logs_token (demo_token),
    INDEX idx_demo_logs_ip (client_ip),
    INDEX idx_demo_logs_action (action),
    INDEX idx_demo_logs_created (created_at)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_demo_sessions_token ON demo_sessions(demo_token);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_ip ON demo_sessions(client_ip);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_active ON demo_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_demo_sms_phone ON demo_sms_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_demo_sms_token ON demo_sms_verifications(demo_token);
CREATE INDEX IF NOT EXISTS idx_demo_sms_expires ON demo_sms_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_sms_verified ON demo_sms_verifications(is_verified);
CREATE INDEX IF NOT EXISTS idx_demo_sms_created ON demo_sms_verifications(created_at);

CREATE INDEX IF NOT EXISTS idx_demo_diagnosis_phone ON demo_diagnosis_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_demo_diagnosis_token ON demo_diagnosis_sessions(demo_token);
CREATE INDEX IF NOT EXISTS idx_demo_diagnosis_verified ON demo_diagnosis_sessions(sms_verified);

-- Row Level Security (RLS) 有効化
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定
-- デモセッションテーブル: service_roleのみアクセス可（セキュリティ重視）
CREATE POLICY IF NOT EXISTS demo_sessions_policy ON demo_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- デモSMS認証テーブル: service_roleのみアクセス可
CREATE POLICY IF NOT EXISTS demo_sms_verifications_policy ON demo_sms_verifications
    FOR ALL USING (auth.role() = 'service_role');

-- デモ診断セッションテーブル: service_roleのみアクセス可
CREATE POLICY IF NOT EXISTS demo_diagnosis_sessions_policy ON demo_diagnosis_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- デモアクセスログテーブル: 読み取りのみ管理者許可、書き込みはservice_role
CREATE POLICY IF NOT EXISTS demo_access_logs_read_policy ON demo_access_logs
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS demo_access_logs_write_policy ON demo_access_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 自動クリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_demo_data()
RETURNS void AS $$
BEGIN
    -- 期限切れのデモセッションとその関連データを削除
    DELETE FROM demo_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    -- 孤立したデモSMS認証記録を削除
    DELETE FROM demo_sms_verifications 
    WHERE demo_token NOT IN (SELECT demo_token FROM demo_sessions);
    
    -- 古いアクセスログを削除（30日以上前）
    DELETE FROM demo_access_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- 統計情報を更新
    ANALYZE demo_sessions, demo_sms_verifications, demo_diagnosis_sessions, demo_access_logs;
END;
$$ language 'plpgsql';

-- デモアクティビティカウント増加関数
CREATE OR REPLACE FUNCTION increment_activity_count(session_token TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE demo_sessions 
    SET activity_count = activity_count + 1,
        last_activity = NOW()
    WHERE demo_token = session_token
    RETURNING activity_count INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$ language 'plpgsql';

-- トリガー関数: updated_at自動更新
CREATE OR REPLACE FUNCTION update_demo_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_demo_diagnosis_sessions_updated_at 
    BEFORE UPDATE ON demo_diagnosis_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_demo_updated_at_column();

-- デモアクセスログ記録関数
CREATE OR REPLACE FUNCTION log_demo_access(
    p_demo_token VARCHAR(64),
    p_client_ip INET,
    p_user_agent TEXT,
    p_action VARCHAR(50),
    p_request_data JSONB DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO demo_access_logs (
        demo_token,
        client_ip,
        user_agent,
        action,
        request_data,
        response_status,
        created_at
    ) VALUES (
        p_demo_token,
        p_client_ip,
        p_user_agent,
        p_action,
        p_request_data,
        p_response_status,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ language 'plpgsql';

-- デモ統計情報ビュー
CREATE OR REPLACE VIEW demo_statistics AS
SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE is_active = true) as active_sessions,
    COUNT(*) FILTER (WHERE verification_completed = true) as completed_verifications,
    AVG(activity_count) as avg_activity_per_session,
    MAX(created_at) as last_session_created,
    COUNT(DISTINCT client_ip) as unique_ips
FROM demo_sessions
WHERE created_at >= NOW() - INTERVAL '7 days';

-- コメント追加
COMMENT ON TABLE demo_sessions IS 'デモセッション管理テーブル - 外部ユーザー向けデモアクセス制御';
COMMENT ON TABLE demo_sms_verifications IS 'デモ用SMS認証テーブル - 実SMS送信なしの仮想認証';
COMMENT ON TABLE demo_diagnosis_sessions IS 'デモ用診断セッションテーブル - デモ環境専用';
COMMENT ON TABLE demo_access_logs IS 'デモアクセスログテーブル - セキュリティ監査用';

COMMENT ON COLUMN demo_sessions.demo_token IS 'デモセッション識別用64文字ハッシュトークン';
COMMENT ON COLUMN demo_sessions.client_ip IS 'デモアクセス元IPアドレス（制限用）';
COMMENT ON COLUMN demo_sessions.expires_at IS 'デモセッション有効期限（30分間）';

COMMENT ON COLUMN demo_sms_verifications.phone_number IS 'デモ用電話番号（09000000001-09000000010）';
COMMENT ON COLUMN demo_sms_verifications.otp_code IS 'デモ用固定OTPコード（123456）';
COMMENT ON COLUMN demo_sms_verifications.demo_token IS 'セッション紐付け用トークン';

-- 初期化完了ログ
INSERT INTO demo_access_logs (
    client_ip,
    action,
    request_data,
    response_status
) VALUES (
    '127.0.0.1'::inet,
    'demo_tables_created',
    '{"migration": "055_create_demo_tables.sql", "timestamp": "' || NOW() || '"}'::jsonb,
    200
);

-- デモテーブル作成完了
SELECT 'Demo tables created successfully' as result;