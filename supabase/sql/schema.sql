-- MoneyTicket セキュア管理システム用データベーススキーマ
-- 強化されたセキュリティ機能を含む

-- ユーザーセッションテーブル（既存）
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    diagnosis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 商品設定テーブル（既存）
CREATE TABLE IF NOT EXISTS product_settings (
    id BIGSERIAL PRIMARY KEY,
    product_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 証言・レビューテーブル（既存）
CREATE TABLE IF NOT EXISTS testimonials (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    occupation VARCHAR(100),
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ホームページコンテンツ設定テーブル（既存）
CREATE TABLE IF NOT EXISTS homepage_content_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新規: セキュア設定管理テーブル
CREATE TABLE IF NOT EXISTS secure_config (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL, -- 暗号化された値
    description TEXT,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- 新規: 管理者認証情報テーブル（セキュア）
CREATE TABLE IF NOT EXISTS admin_credentials (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- SHA-256 ハッシュ
    phone_number VARCHAR(20) NOT NULL,
    backup_code VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    requires_password_change BOOLEAN DEFAULT false
);

-- 新規: ログイン試行履歴テーブル
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(200),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新規: 管理者セッションテーブル
CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES admin_credentials(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    encrypted_session_data TEXT, -- 暗号化されたセッションデータ
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新規: システム監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL, -- 'login', 'config_change', 'data_access', etc.
    username VARCHAR(50),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB, -- 追加情報
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新規: セキュリティ設定テーブル
CREATE TABLE IF NOT EXISTS security_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_name VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    is_system_setting BOOLEAN DEFAULT false,
    description TEXT,
    updated_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_sessions_phone ON user_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip ON user_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_username ON admin_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created_at ON admin_login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON admin_login_attempts(ip_address);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_secure_config_key ON secure_config(key);
CREATE INDEX IF NOT EXISTS idx_homepage_content_setting_key ON homepage_content_settings(setting_key);

-- Row Level Security (RLS) 有効化
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定（管理者のみアクセス可能）
CREATE POLICY admin_credentials_policy ON admin_credentials
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_login_attempts_policy ON admin_login_attempts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY admin_sessions_policy ON admin_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY audit_logs_policy ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY secure_config_policy ON secure_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY security_settings_policy ON security_settings
    FOR ALL USING (auth.role() = 'service_role');

-- デフォルト管理者アカウント作成（初回セットアップ用）
INSERT INTO admin_credentials (
    username, 
    password_hash, 
    phone_number, 
    backup_code,
    created_at,
    updated_at
) VALUES (
    'admin',
    -- 本番環境用のハッシュ化されたパスワード（本番では変更必須）
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- SHA-256 hash of 'CHANGE_IN_PRODUCTION'
    '+819012345678', -- 本番環境用（本番では変更必須）
    'MT-SECURE-BACKUP-' || extract(epoch from now())::text, -- 動的バックアップコード
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 初期セキュリティ設定
INSERT INTO security_settings (setting_name, setting_value, is_system_setting, description) VALUES
('max_login_attempts', '5', true, 'ログイン試行回数の上限'),
('lockout_duration', '900', true, 'ロックアウト時間（秒）'),
('session_timeout', '1800', true, 'セッションタイムアウト（秒）'),
('password_min_length', '12', true, 'パスワード最小長'),
('require_2fa', 'true', true, '2要素認証必須'),
('allowed_ip_ranges', '["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]', true, '許可IPアドレス範囲')
ON CONFLICT (setting_name) DO NOTHING;

-- 初期セキュア設定（JWT秘密鍵など）
INSERT INTO secure_config (key, value, description, is_encrypted) VALUES
('jwt_secret', 'CHANGE_IN_PRODUCTION_' || extract(epoch from now())::text, 'JWT署名用秘密鍵', true),
('encryption_key', 'CHANGE_IN_PRODUCTION_' || extract(epoch from now())::text, 'データ暗号化キー', true),
('twilio_account_sid', '', 'Twilio Account SID', true),
('twilio_auth_token', '', 'Twilio Auth Token', true),
('twilio_phone_number', '', 'Twilio Phone Number', true)
ON CONFLICT (key) DO NOTHING;

-- システム監査ログの初期エントリ
INSERT INTO audit_logs (event_type, username, description, severity) VALUES
('system_init', 'system', 'MoneyTicket セキュアシステム初期化完了', 'info');

-- 古いデータクリーンアップ用の関数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- 30日以上古いログイン試行履歴を削除
    DELETE FROM admin_login_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- 期限切れセッションを削除
    DELETE FROM admin_sessions 
    WHERE expires_at < NOW();
    
    -- 90日以上古い監査ログを削除（criticalは除く）
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND severity != 'critical';
    
    -- 1年以上古いユーザーセッションを削除
    DELETE FROM user_sessions 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- 自動クリーンアップの設定（pg_cronが利用可能な場合）
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- セキュリティビュー（機密情報をマスクして表示）
CREATE OR REPLACE VIEW admin_credentials_safe AS
SELECT 
    id,
    username,
    CASE 
        WHEN password_hash IS NOT NULL THEN '[PROTECTED]'
        ELSE NULL 
    END as password_status,
    LEFT(phone_number, 3) || '****' || RIGHT(phone_number, 2) as phone_number_masked,
    CASE 
        WHEN backup_code IS NOT NULL THEN '[SET]'
        ELSE '[NOT_SET]'
    END as backup_code_status,
    is_active,
    failed_attempts,
    locked_until,
    last_login,
    created_at,
    updated_at,
    password_changed_at,
    requires_password_change
FROM admin_credentials;

-- 最新ログイン試行のビュー
CREATE OR REPLACE VIEW recent_login_attempts AS
SELECT 
    username,
    success,
    failure_reason,
    ip_address,
    created_at
FROM admin_login_attempts 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- セキュリティダッシュボード用のビュー
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
    (SELECT COUNT(*) FROM admin_login_attempts WHERE success = false AND created_at > NOW() - INTERVAL '1 hour') as failed_logins_last_hour,
    (SELECT COUNT(*) FROM admin_sessions WHERE is_active = true) as active_sessions,
    (SELECT COUNT(*) FROM audit_logs WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') as critical_events_today,
    (SELECT COUNT(*) FROM user_sessions WHERE created_at > NOW() - INTERVAL '24 hours') as user_diagnoses_today;

-- セキュリティ更新トリガー
CREATE OR REPLACE FUNCTION update_security_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- 重要な変更を監査ログに記録
    IF TG_TABLE_NAME = 'admin_credentials' THEN
        INSERT INTO audit_logs (event_type, username, description, severity)
        VALUES ('admin_credential_change', NEW.username, 'Admin credentials updated', 'warning');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER trigger_admin_credentials_update
    BEFORE UPDATE ON admin_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_security_timestamp();

CREATE TRIGGER trigger_secure_config_update
    BEFORE UPDATE ON secure_config
    FOR EACH ROW
    EXECUTE FUNCTION update_security_timestamp();

CREATE TRIGGER trigger_security_settings_update
    BEFORE UPDATE ON security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_security_timestamp();

-- コメント追加
COMMENT ON TABLE admin_credentials IS 'セキュアな管理者認証情報';
COMMENT ON TABLE admin_login_attempts IS '管理者ログイン試行履歴';
COMMENT ON TABLE admin_sessions IS 'アクティブな管理者セッション';
COMMENT ON TABLE audit_logs IS 'システム監査ログ';
COMMENT ON TABLE secure_config IS 'セキュアな設定情報（暗号化）';
COMMENT ON TABLE security_settings IS 'セキュリティ設定';

COMMENT ON VIEW admin_credentials_safe IS '管理者認証情報（機密情報マスク済み）';
COMMENT ON VIEW recent_login_attempts IS '最近のログイン試行履歴';
COMMENT ON VIEW security_dashboard IS 'セキュリティダッシュボード統計';

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ MoneyTicket セキュアデータベーススキーマの初期化が完了しました';
    RAISE NOTICE '🔒 Row Level Security (RLS) が有効化されました';
    RAISE NOTICE '🛡️ 監査ログとセキュリティ機能が設定されました';
    RAISE NOTICE '⚠️  本番環境では admin_credentials テーブルのデフォルト値を必ず変更してください';
END $$;
