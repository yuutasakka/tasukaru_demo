-- admin_credentials テーブルのRLSポリシーを修正
-- anon keyでも読み取りのみ可能にする（認証のため）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "admin_credentials_access_policy" ON admin_credentials;
DROP POLICY IF EXISTS "Admin only access credentials" ON admin_credentials;
DROP POLICY IF EXISTS "Service role only admin credentials" ON admin_credentials;
DROP POLICY IF EXISTS "admin_credentials_policy" ON admin_credentials;

-- 新しいポリシーを作成
-- 1. 読み取り（SELECT）は誰でも可能（パスワード検証のため）
CREATE POLICY "admin_credentials_select_policy" ON admin_credentials
    FOR SELECT 
    USING (true);

-- 2. 挿入（INSERT）はservice_roleのみ
CREATE POLICY "admin_credentials_insert_policy" ON admin_credentials
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- 3. 更新（UPDATE）はservice_roleのみ
CREATE POLICY "admin_credentials_update_policy" ON admin_credentials
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 4. 削除（DELETE）はservice_roleのみ
CREATE POLICY "admin_credentials_delete_policy" ON admin_credentials
    FOR DELETE
    USING (auth.role() = 'service_role');

-- 同様にadmin_login_attemptsとaudit_logsも修正
-- admin_login_attempts
DROP POLICY IF EXISTS "admin_login_attempts_access_policy" ON admin_login_attempts;
DROP POLICY IF EXISTS "Admin only access login attempts" ON admin_login_attempts;

-- 読み取りと挿入は誰でも可能（ログイン試行記録のため）
CREATE POLICY "admin_login_attempts_select_policy" ON admin_login_attempts
    FOR SELECT 
    USING (true);

CREATE POLICY "admin_login_attempts_insert_policy" ON admin_login_attempts
    FOR INSERT 
    WITH CHECK (true);

-- 更新と削除はservice_roleのみ
CREATE POLICY "admin_login_attempts_update_policy" ON admin_login_attempts
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_login_attempts_delete_policy" ON admin_login_attempts
    FOR DELETE
    USING (auth.role() = 'service_role');

-- audit_logs
DROP POLICY IF EXISTS "audit_logs_access_policy" ON audit_logs;
DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role write audit logs" ON audit_logs;

-- 読み取りと挿入は誰でも可能（監査ログ記録のため）
CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT 
    USING (true);

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT 
    WITH CHECK (true);

-- 更新と削除はservice_roleのみ
CREATE POLICY "audit_logs_update_policy" ON audit_logs
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "audit_logs_delete_policy" ON audit_logs
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('admin_credentials', 'admin_login_attempts', 'audit_logs')
ORDER BY tablename, policyname;