-- AI ConnectX 管理者システム用データベーススキーマ
-- 初回実行用（DROP文なし）

-- 管理者認証情報テーブル（セキュア）
CREATE TABLE admin_credentials (
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

-- 管理者ログイン試行履歴テーブル
CREATE TABLE admin_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(200),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- システム監査ログテーブル
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    username VARCHAR(50),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_username ON admin_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created_at ON admin_login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security (RLS) の有効化
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 管理者用のポリシー作成（サービスロールのみアクセス可能）
CREATE POLICY "admin_credentials_access_policy" ON admin_credentials
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "admin_login_attempts_access_policy" ON admin_login_attempts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "audit_logs_access_policy" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- デフォルト管理者アカウント作成
-- ユーザー名: admin
-- SECURITY: Default password removed - set via environment variable
INSERT INTO admin_credentials (
    username, 
    password_hash, 
    phone_number, 
    backup_code,
    created_at,
    updated_at
) VALUES (
    'admin',
    'CHANGE_PASSWORD_IMMEDIATELY', -- SECURITY: Default password removed - set via environment variable
    '+819012345678',
    'MT-BACKUP-' || extract(epoch from now())::text,
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    phone_number = EXCLUDED.phone_number,
    backup_code = EXCLUDED.backup_code,
    updated_at = NOW();

-- 更新用トリガー関数
CREATE OR REPLACE FUNCTION update_admin_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER trigger_admin_credentials_update
    BEFORE UPDATE ON admin_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_timestamp(); 