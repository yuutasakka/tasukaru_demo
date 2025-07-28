-- ユーザー管理システムのテーブル作成

-- 新規登録申請テーブル
CREATE TABLE IF NOT EXISTS registration_requests (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    organization VARCHAR(200),
    purpose TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- ユーザープロファイルテーブル（auth.usersの拡張）
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    organization VARCHAR(200),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    requires_password_change BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーロール管理テーブル
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_name)
);

-- ユーザーアクティビティログテーブル
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- トリガー関数: ユーザー作成時にプロファイルを自動作成
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー関数: updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー関数: ユーザーアクティビティログ記録
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_logs (user_id, action, details)
        VALUES (NEW.id, 'profile_created', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO user_activity_logs (user_id, action, details)
        VALUES (NEW.id, 'profile_updated', jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_create_profile_for_user ON auth.users;
CREATE TRIGGER trigger_create_profile_for_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

DROP TRIGGER IF EXISTS trigger_update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER trigger_update_registration_requests_updated_at
    BEFORE UPDATE ON registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_log_profile_activity ON profiles;
CREATE TRIGGER trigger_log_profile_activity
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- RLS (Row Level Security) ポリシー設定

-- registration_requests テーブル
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- 管理者のみ全てのレコードにアクセス可能
CREATE POLICY "管理者は全ての申請を管理可能" ON registration_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- profiles テーブル
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルのみ閲覧・更新可能
CREATE POLICY "ユーザーは自分のプロファイルを管理可能" ON profiles
    FOR ALL USING (auth.uid() = id);

-- 管理者は全てのプロファイルにアクセス可能
CREATE POLICY "管理者は全てのプロファイルを管理可能" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'manager')
        )
    );

-- user_roles テーブル
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "管理者はユーザーロールを管理可能" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- user_activity_logs テーブル
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のログのみ閲覧可能
CREATE POLICY "ユーザーは自分のアクティビティログを閲覧可能" ON user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全てのログにアクセス可能
CREATE POLICY "管理者は全てのアクティビティログを管理可能" ON user_activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- 初期データ挿入（テスト用）
INSERT INTO registration_requests (full_name, email, phone_number, organization, purpose, status, created_at) VALUES
('山田太郎', 'yamada@example.com', '09012345678', '株式会社テスト', 'AI ConnectXを使って資産運用の診断を行いたいと考えています。特に長期投資戦略について詳しく知りたいです。', 'pending', NOW() - INTERVAL '2 hours'),
('佐藤花子', 'sato@example.com', '08098765432', 'フリーランス', '個人事業主として資産形成を始めたいと思っています。税制優遇制度の活用方法についても相談したいです。', 'pending', NOW() - INTERVAL '1 hour')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE registration_requests IS 'ユーザー新規登録申請テーブル';
COMMENT ON TABLE profiles IS 'ユーザープロファイル拡張テーブル';
COMMENT ON TABLE user_roles IS 'ユーザーロール管理テーブル';
COMMENT ON TABLE user_activity_logs IS 'ユーザーアクティビティログテーブル'; 