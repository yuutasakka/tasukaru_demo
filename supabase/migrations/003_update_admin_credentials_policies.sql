-- 現在のポリシーを確認（コメントとして記録）
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'admin_credentials';

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "admin_credentials_access_policy" ON admin_credentials;
DROP POLICY IF EXISTS "admin_credentials_read_policy" ON admin_credentials;
DROP POLICY IF EXISTS "admin_credentials_write_policy" ON admin_credentials;

-- より柔軟なポリシーを作成
CREATE POLICY "admin_credentials_read_policy" ON admin_credentials
    FOR SELECT USING (true);

CREATE POLICY "admin_credentials_write_policy" ON admin_credentials
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'anon');

-- ポリシー作成後の確認クエリ（コメントとして記録）
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'admin_credentials'; 