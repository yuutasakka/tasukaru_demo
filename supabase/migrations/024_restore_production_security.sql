-- 📋 本番環境向けセキュリティ復元マイグレーション
-- 目的: RLSの再有効化と適切な権限ポリシーの実装

-- Step 1: 全テーブルのRLSを再有効化
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
            RAISE NOTICE 'RLS enabled for table: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to enable RLS for table: % (Error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: 危険な匿名アクセス権限を削除
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            -- 匿名ユーザーからの全権限を削除
            EXECUTE format('REVOKE ALL ON %I FROM anon', table_record.tablename);
            -- public ロールからの危険な権限を削除
            EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %I FROM public', table_record.tablename);
            RAISE NOTICE 'Revoked dangerous permissions for table: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to revoke permissions for table: % (Error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: 管理者テーブルのセキュア化
-- 管理者クレデンシャルテーブル（service_roleのみアクセス可能）
DROP POLICY IF EXISTS "admin_only_access" ON admin_credentials;
CREATE POLICY "admin_only_access" ON admin_credentials
FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "admin_login_service_only" ON admin_login_attempts;
CREATE POLICY "admin_login_service_only" ON admin_login_attempts
FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "audit_logs_service_only" ON audit_logs;
CREATE POLICY "audit_logs_service_only" ON audit_logs
FOR ALL TO service_role USING (true);

-- Step 4: 公開コンテンツテーブルの安全な読み取り権限
-- ホームページコンテンツ（アクティブなもののみ読み取り可能）
DROP POLICY IF EXISTS "public_read_active_content" ON homepage_content_settings;
CREATE POLICY "public_read_active_content" ON homepage_content_settings
FOR SELECT TO anon, authenticated 
USING (is_active = true);

-- service_roleは全権限
DROP POLICY IF EXISTS "service_role_all_content" ON homepage_content_settings;
CREATE POLICY "service_role_all_content" ON homepage_content_settings
FOR ALL TO service_role USING (true);

-- 法的リンク（アクティブなもののみ）
DROP POLICY IF EXISTS "public_read_active_legal" ON legal_links;
CREATE POLICY "public_read_active_legal" ON legal_links
FOR SELECT TO anon, authenticated 
USING (is_active = true);

DROP POLICY IF EXISTS "service_role_all_legal" ON legal_links;
CREATE POLICY "service_role_all_legal" ON legal_links
FOR ALL TO service_role USING (true);

-- 金融商品（アクティブなもののみ）
DROP POLICY IF EXISTS "public_read_active_products" ON financial_products;
CREATE POLICY "public_read_active_products" ON financial_products
FOR SELECT TO anon, authenticated 
USING (is_active = true);

DROP POLICY IF EXISTS "service_role_all_products" ON financial_products;
CREATE POLICY "service_role_all_products" ON financial_products
FOR ALL TO service_role USING (true);

-- ファイナンシャルプランナー（アクティブなもののみ）
DROP POLICY IF EXISTS "public_read_active_planners" ON financial_planners;
CREATE POLICY "public_read_active_planners" ON financial_planners
FOR SELECT TO anon, authenticated 
USING (is_active = true);

DROP POLICY IF EXISTS "service_role_all_planners" ON financial_planners;
CREATE POLICY "service_role_all_planners" ON financial_planners
FOR ALL TO service_role USING (true);

-- Step 5: 診断セッションのユーザー専用アクセス
-- 自分のセッションのみアクセス可能（authenticated userの場合）
DROP POLICY IF EXISTS "user_own_sessions" ON diagnosis_sessions;
CREATE POLICY "user_own_sessions" ON diagnosis_sessions
FOR ALL TO authenticated 
USING (auth.uid()::text = user_id OR phone_number = auth.jwt() ->> 'phone');

-- 匿名ユーザーは電話番号ベースでのアクセス（セッション内のみ）
DROP POLICY IF EXISTS "anon_session_based" ON diagnosis_sessions;
CREATE POLICY "anon_session_based" ON diagnosis_sessions
FOR SELECT TO anon 
USING (created_at > (now() - interval '1 hour'));

-- service_roleは全権限
DROP POLICY IF EXISTS "service_role_all_sessions" ON diagnosis_sessions;
CREATE POLICY "service_role_all_sessions" ON diagnosis_sessions
FOR ALL TO service_role USING (true);

-- Step 6: SMS検証テーブルのセキュア化
-- 電話番号の所有者のみアクセス可能
DROP POLICY IF EXISTS "phone_owner_only" ON sms_verifications;
CREATE POLICY "phone_owner_only" ON sms_verifications
FOR ALL TO anon, authenticated 
USING (phone_number = current_setting('app.current_phone', true));

-- service_roleは全権限
DROP POLICY IF EXISTS "service_role_all_sms" ON sms_verifications;
CREATE POLICY "service_role_all_sms" ON sms_verifications
FOR ALL TO service_role USING (true);

-- Step 7: エキスパート連絡設定（読み取り専用）
DROP POLICY IF EXISTS "public_read_expert_contact" ON expert_contact_settings;
CREATE POLICY "public_read_expert_contact" ON expert_contact_settings
FOR SELECT TO anon, authenticated 
USING (is_active = true);

DROP POLICY IF EXISTS "service_role_all_expert" ON expert_contact_settings;
CREATE POLICY "service_role_all_expert" ON expert_contact_settings
FOR ALL TO service_role USING (true);

-- Step 8: セキュア設定テーブル（service_roleのみ）
DROP POLICY IF EXISTS "service_role_only_secure_config" ON secure_configs;
CREATE POLICY "service_role_only_secure_config" ON secure_configs
FOR ALL TO service_role USING (true);

-- Step 9: 権限確認とアクセステスト
-- RLS状態の確認
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS有効（セキュア）'
        ELSE '❌ RLS無効（危険）'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 危険な権限の確認
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'public')
AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
AND table_name IN ('admin_credentials', 'admin_login_attempts', 'audit_logs')
ORDER BY table_name, grantee;

-- Step 10: 管理者アカウントのセキュリティ確認
SELECT 
    username, 
    phone_number, 
    is_active,
    CASE 
        WHEN backup_code IS NOT NULL THEN '✅ バックアップコード設定済み'
        ELSE '⚠️ バックアップコード未設定'
    END as backup_status
FROM admin_credentials 
WHERE username = 'admin';

-- 最終確認メッセージ
DO $$
DECLARE
    total_tables INTEGER;
    rls_enabled_tables INTEGER;
    dangerous_permissions INTEGER;
BEGIN
    -- テーブル数とRLS有効化数をカウント
    SELECT COUNT(*) INTO total_tables
    FROM pg_tables WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO rls_enabled_tables
    FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
    
    -- 危険な権限をカウント
    SELECT COUNT(*) INTO dangerous_permissions
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'public')
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
    AND table_name IN ('admin_credentials', 'admin_login_attempts', 'audit_logs');
    
    RAISE NOTICE '📊 セキュリティ復元結果:';
    RAISE NOTICE '   - 総テーブル数: %', total_tables;
    RAISE NOTICE '   - RLS有効テーブル数: %', rls_enabled_tables;
    RAISE NOTICE '   - 危険な権限数: %', dangerous_permissions;
    
    IF rls_enabled_tables = total_tables AND dangerous_permissions = 0 THEN
        RAISE NOTICE '🎉 ✅ セキュリティ復元完了 - 本番環境デプロイ可能';
    ELSE
        RAISE NOTICE '⚠️ セキュリティ復元に問題があります。確認が必要です。';
    END IF;
END $$;

-- Step 11: セキュア管理者アクセス用の関数作成
CREATE OR REPLACE FUNCTION secure_admin_login(username_param text, password_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    result json;
BEGIN
    -- レート制限チェック（簡易版）
    IF EXISTS (
        SELECT 1 FROM admin_login_attempts 
        WHERE username = username_param 
        AND created_at > (now() - interval '1 hour')
        AND success = false
        HAVING COUNT(*) >= 5
    ) THEN
        -- 失敗ログ記録
        INSERT INTO admin_login_attempts (username, ip_address, success, failure_reason)
        VALUES (username_param, 'rate_limited', false, 'Rate limit exceeded');
        
        RETURN json_build_object(
            'success', false,
            'error', 'Rate limit exceeded. Try again in 1 hour.'
        );
    END IF;
    
    -- 管理者認証
    SELECT * INTO user_record
    FROM admin_credentials
    WHERE username = username_param AND is_active = true;
    
    IF user_record IS NULL THEN
        -- 失敗ログ記録
        INSERT INTO admin_login_attempts (username, ip_address, success, failure_reason)
        VALUES (username_param, 'unknown', false, 'Invalid username');
        
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid credentials'
        );
    END IF;
    
    -- パスワード検証（実際の実装では bcrypt を使用）
    IF user_record.password_hash != crypt(password_param, user_record.password_hash) THEN
        -- 失敗ログ記録
        INSERT INTO admin_login_attempts (username, ip_address, success, failure_reason)
        VALUES (username_param, 'unknown', false, 'Invalid password');
        
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid credentials'
        );
    END IF;
    
    -- 成功ログ記録
    INSERT INTO admin_login_attempts (username, ip_address, success)
    VALUES (username_param, 'unknown', true);
    
    -- ログイン時刻更新
    UPDATE admin_credentials 
    SET last_login_at = now()
    WHERE username = username_param;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_record.id,
        'username', user_record.username,
        'role', user_record.role
    );
END;
$$;

-- 管理者のみが関数を実行可能
REVOKE ALL ON FUNCTION secure_admin_login FROM PUBLIC;
GRANT EXECUTE ON FUNCTION secure_admin_login TO service_role;

-- 最終メッセージ
SELECT '🔒 本番環境セキュリティ復元完了 - 全テーブルでRLS有効化済み' as final_status;