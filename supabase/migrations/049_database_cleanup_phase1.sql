-- タスカル データベース整理 Phase 1
-- 不要なテーブルの削除と構造の最適化

-- 1. まず、削除予定のテーブルのバックアップ情報を表示
SELECT 
    'バックアップが必要なテーブル一覧' as info,
    table_name,
    (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_name = tables.table_name) as record_count
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN (
    'password_history',
    'pending_admin_approvals',
    'admin_approval_history',
    'admin_email_verification',
    'admin_sms_verification',
    'admin_login_attempts',
    'profiles',
    'user_roles',
    'user_activity_logs',
    'registration_requests',
    'secure_configs',
    'sms_verification'
);

-- 2. 外部キー制約の確認と削除
-- auth.usersへの参照を持つテーブルの制約を削除
DO $$
BEGIN
    -- profilesテーブルの外部キー制約を削除
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    END IF;
    
    -- user_rolesテーブルの外部キー制約を削除
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
    END IF;
    
    -- user_activity_logsテーブルの外部キー制約を削除
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_logs') THEN
        ALTER TABLE user_activity_logs DROP CONSTRAINT IF EXISTS user_activity_logs_user_id_fkey;
    END IF;
END $$;

-- 3. 即座に削除可能なテーブルを削除
DROP TABLE IF EXISTS password_history CASCADE;
DROP TABLE IF EXISTS pending_admin_approvals CASCADE;
DROP TABLE IF EXISTS admin_approval_history CASCADE;
DROP TABLE IF EXISTS admin_email_verification CASCADE;
DROP TABLE IF EXISTS admin_sms_verification CASCADE;

-- 4. admin_login_attemptsの必要なデータをaudit_logsに移行してから削除
-- まず、admin_login_attemptsのデータをaudit_logsに移行
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_login_attempts') THEN
        INSERT INTO audit_logs (event_type, username, description, ip_address, user_agent, severity, created_at)
        SELECT 
            CASE WHEN success THEN 'admin_login_success' ELSE 'admin_login_failure' END,
            username,
            CASE 
                WHEN success THEN 'Admin login successful'
                ELSE COALESCE('Admin login failed: ' || failure_reason, 'Admin login failed')
            END,
            ip_address,
            user_agent,
            CASE WHEN success THEN 'info' ELSE 'warning' END,
            created_at
        FROM admin_login_attempts
        WHERE created_at > NOW() - INTERVAL '30 days'; -- 過去30日分のみ移行
        
        -- テーブルを削除
        DROP TABLE admin_login_attempts CASCADE;
    END IF;
END $$;

-- 5. 重複インデックスの削除（sms_verifications）
DROP INDEX IF EXISTS idx_sms_verifications_phone;
DROP INDEX IF EXISTS idx_sms_verifications_created_at;
DROP INDEX IF EXISTS idx_sms_verifications_request_ip;
-- 複合インデックスは保持（idx_phone_verified_created）

-- 6. RLSポリシーの整理と統一

-- homepage_content_settingsのポリシー統一
DROP POLICY IF EXISTS "Public read access" ON homepage_content_settings;
DROP POLICY IF EXISTS "Service role write access" ON homepage_content_settings;
DROP POLICY IF EXISTS "Public can read active homepage_content" ON homepage_content_settings;
DROP POLICY IF EXISTS "Authenticated can manage homepage_content" ON homepage_content_settings;

CREATE POLICY "Public read homepage_content" ON homepage_content_settings
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Service role manage homepage_content" ON homepage_content_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- admin_settingsのポリシー統一
DROP POLICY IF EXISTS "Admin only access" ON admin_settings;
DROP POLICY IF EXISTS "Public can read admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Authenticated can manage admin_settings" ON admin_settings;

CREATE POLICY "Service role manage admin_settings" ON admin_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 7. 不要なテーブルの削除（Supabase Auth関連）
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;

-- 8. 古いSMS認証テーブルの削除
DROP TABLE IF EXISTS sms_verification CASCADE;

-- 9. secure_configsテーブルの削除（admin_settingsに統合）
-- まず、必要なデータをadmin_settingsに移行
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'secure_configs') THEN
        INSERT INTO admin_settings (setting_key, setting_value, description)
        SELECT 
            config_key,
            jsonb_build_object('value', config_value, 'is_encrypted', is_encrypted),
            'Migrated from secure_configs'
        FROM secure_configs
        ON CONFLICT (setting_key) DO UPDATE 
        SET setting_value = EXCLUDED.setting_value,
            updated_at = NOW();
        
        -- テーブルを削除
        DROP TABLE secure_configs CASCADE;
    END IF;
END $$;

-- 10. registration_requestsテーブルの確認と削除
-- approve-registration関数が使用していないことを確認してから削除
DROP TABLE IF EXISTS registration_requests CASCADE;

-- 11. 統計情報の更新
ANALYZE;

-- 12. 完了メッセージ
SELECT 
    'データベース整理 Phase 1 完了' as status,
    COUNT(*) as remaining_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- 削除されたテーブルのリスト
SELECT '削除されたテーブル:
- password_history
- pending_admin_approvals
- admin_approval_history
- admin_email_verification
- admin_sms_verification
- admin_login_attempts
- profiles
- user_roles
- user_activity_logs
- registration_requests
- secure_configs
- sms_verification' as deleted_tables;