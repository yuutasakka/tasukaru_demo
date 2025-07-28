-- RLSポリシーの修正と強化

-- registration_requests テーブルのポリシー修正
DROP POLICY IF EXISTS "管理者は全ての申請を管理可能" ON registration_requests;

-- より柔軟なポリシーを作成
CREATE POLICY "registration_requests_admin_access" ON registration_requests
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- 申請者本人は自分の申請のみ閲覧可能
CREATE POLICY "registration_requests_user_read" ON registration_requests
    FOR SELECT USING (
        auth.jwt() ->> 'email' = email
    );

-- profiles テーブルのポリシー修正
DROP POLICY IF EXISTS "ユーザーは自分のプロファイルを管理可能" ON profiles;
DROP POLICY IF EXISTS "管理者は全てのプロファイルを管理可能" ON profiles;

-- 自分のプロファイルアクセス
CREATE POLICY "profiles_own_access" ON profiles
    FOR ALL USING (auth.uid() = id);

-- 管理者は全アクセス
CREATE POLICY "profiles_admin_access" ON profiles
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'manager')
            AND p.status = 'active'
        )
    );

-- 公開プロファイル情報の読み取り（名前のみ）
CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT USING (true)
    WITH CHECK (false); -- 書き込みは制限

-- user_roles テーブルのポリシー修正
DROP POLICY IF EXISTS "管理者はユーザーロールを管理可能" ON user_roles;

CREATE POLICY "user_roles_admin_access" ON user_roles
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
            AND profiles.status = 'active'
        )
    );

-- ユーザーは自分のロール閲覧のみ可能
CREATE POLICY "user_roles_user_read" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- user_activity_logs テーブルのポリシー修正
DROP POLICY IF EXISTS "ユーザーは自分のアクティビティログを閲覧可能" ON user_activity_logs;
DROP POLICY IF EXISTS "管理者は全てのアクティビティログを管理可能" ON user_activity_logs;

-- 自分のログ閲覧
CREATE POLICY "activity_logs_user_read" ON user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全ログアクセス
CREATE POLICY "activity_logs_admin_access" ON user_activity_logs
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
            AND profiles.status = 'active'
        )
    );

-- セキュリティ監査ログ
INSERT INTO audit_logs (event_type, username, description, severity) VALUES
('security_policy_update', 'system', 'RLSポリシーを強化しました', 'info'); 