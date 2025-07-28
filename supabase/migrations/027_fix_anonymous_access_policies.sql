-- 🔧 匿名アクセス修正: RLSポリシーの調整
-- 目的: 401エラーを解決し、必要なデータへの匿名アクセスを許可

-- Step 1: 現在のRLS状態を確認
SELECT 
    '=== 現在のRLS状態 ===' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('homepage_content_settings', 'legal_links', 'financial_products', 'financial_planners', 'expert_contact_settings', 'admin_settings')
ORDER BY tablename;

-- Step 2: 匿名アクセス用のRLSポリシーを修正
DO $$
DECLARE
    table_record RECORD;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔐 匿名アクセスポリシー修正開始';
    
    -- homepage_content_settings テーブル
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'homepage_content_settings'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "public_read_active_content" ON homepage_content_settings;
        DROP POLICY IF EXISTS "Public read active homepage settings" ON homepage_content_settings;
        DROP POLICY IF EXISTS "homepage_content_read_policy" ON homepage_content_settings;
        
        -- 新しい匿名アクセスポリシーを作成
        CREATE POLICY "anonymous_read_homepage_content" ON homepage_content_settings
        FOR SELECT TO anon, authenticated 
        USING (is_active = true OR is_active IS NULL);
        
        -- service_role用の全権限ポリシー
        DROP POLICY IF EXISTS "service_role_all_content" ON homepage_content_settings;
        CREATE POLICY "service_role_all_content" ON homepage_content_settings
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE '✅ homepage_content_settings のポリシーを修正';
    END IF;
    
    -- legal_links テーブル
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'legal_links'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "public_read_active_legal" ON legal_links;
        DROP POLICY IF EXISTS "Public read active legal links" ON legal_links;
        
        -- 新しい匿名アクセスポリシーを作成
        CREATE POLICY "anonymous_read_legal_links" ON legal_links
        FOR SELECT TO anon, authenticated 
        USING (is_active = true OR is_active IS NULL);
        
        -- service_role用の全権限ポリシー
        DROP POLICY IF EXISTS "service_role_all_legal" ON legal_links;
        CREATE POLICY "service_role_all_legal" ON legal_links
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE '✅ legal_links のポリシーを修正';
    END IF;
    
    -- financial_products テーブル
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'financial_products'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "public_read_active_products" ON financial_products;
        DROP POLICY IF EXISTS "Public read active products" ON financial_products;
        
        -- 新しい匿名アクセスポリシーを作成
        CREATE POLICY "anonymous_read_financial_products" ON financial_products
        FOR SELECT TO anon, authenticated 
        USING (is_active = true OR is_active IS NULL);
        
        -- service_role用の全権限ポリシー
        DROP POLICY IF EXISTS "service_role_all_products" ON financial_products;
        CREATE POLICY "service_role_all_products" ON financial_products
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE '✅ financial_products のポリシーを修正';
    END IF;
    
    -- financial_planners テーブル
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'financial_planners'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "public_read_active_planners" ON financial_planners;
        DROP POLICY IF EXISTS "Public read active planners" ON financial_planners;
        
        -- 新しい匿名アクセスポリシーを作成
        CREATE POLICY "anonymous_read_financial_planners" ON financial_planners
        FOR SELECT TO anon, authenticated 
        USING (is_active = true OR is_active IS NULL);
        
        -- service_role用の全権限ポリシー
        DROP POLICY IF EXISTS "service_role_all_planners" ON financial_planners;
        CREATE POLICY "service_role_all_planners" ON financial_planners
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE '✅ financial_planners のポリシーを修正';
    END IF;
    
    -- expert_contact_settings テーブル
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'expert_contact_settings'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "public_read_expert_contact" ON expert_contact_settings;
        DROP POLICY IF EXISTS "Public read active contact settings" ON expert_contact_settings;
        
        -- 新しい匿名アクセスポリシーを作成
        CREATE POLICY "anonymous_read_expert_contact" ON expert_contact_settings
        FOR SELECT TO anon, authenticated 
        USING (is_active = true OR is_active IS NULL);
        
        -- service_role用の全権限ポリシー
        DROP POLICY IF EXISTS "service_role_all_expert" ON expert_contact_settings;
        CREATE POLICY "service_role_all_expert" ON expert_contact_settings
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE '✅ expert_contact_settings のポリシーを修正';
    END IF;
    
    -- admin_settings テーブル（特定のキーのみ公開）
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'admin_settings'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 既存のポリシーを削除
        DROP POLICY IF EXISTS "public_read_safe_admin_settings" ON admin_settings;
        DROP POLICY IF EXISTS "Public read safe admin settings" ON admin_settings;
        
        -- 新しい匿名アクセスポリシーを作成（安全な設定のみ）
        CREATE POLICY "anonymous_read_safe_admin_settings" ON admin_settings
        FOR SELECT TO anon, authenticated 
        USING (setting_key IN ('testimonials', 'public_announcements', 'site_maintenance', 'contact_info'));
        
        -- service_role用の全権限ポリシー
        DROP POLICY IF EXISTS "service_role_all_admin" ON admin_settings;
        CREATE POLICY "service_role_all_admin" ON admin_settings
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE '✅ admin_settings のポリシーを修正';
    END IF;
    
    RAISE NOTICE '🎉 匿名アクセスポリシー修正完了';
END $$;

-- Step 3: 匿名ユーザーに対する基本的なSELECT権限を付与
DO $$
DECLARE
    table_record RECORD;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔓 匿名ユーザーへの基本権限付与開始';
    
    FOR table_record IN 
        SELECT unnest(ARRAY['homepage_content_settings', 'legal_links', 'financial_products', 
                           'financial_planners', 'expert_contact_settings', 'admin_settings']) as table_name
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = table_record.table_name
            AND schemaname = 'public'
        ) INTO table_exists;
        
        IF table_exists THEN
            BEGIN
                -- 匿名ユーザーにSELECT権限を付与
                EXECUTE format('GRANT SELECT ON %I TO anon', table_record.table_name);
                -- 認証済みユーザーにもSELECT権限を付与
                EXECUTE format('GRANT SELECT ON %I TO authenticated', table_record.table_name);
                RAISE NOTICE '✅ テーブル % に匿名SELECT権限を付与', table_record.table_name;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ テーブル % の権限付与に失敗: %', table_record.table_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 匿名ユーザーへの基本権限付与完了';
END $$;

-- Step 4: 診断セッションテーブルの匿名アクセス許可
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'diagnosis_sessions'
        AND schemaname = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 診断セッション用の匿名アクセスポリシー
        DROP POLICY IF EXISTS "anonymous_access_sessions" ON diagnosis_sessions;
        DROP POLICY IF EXISTS "Anonymous access sessions" ON diagnosis_sessions;
        DROP POLICY IF EXISTS "anonymous_insert_sessions" ON diagnosis_sessions;
        DROP POLICY IF EXISTS "Anonymous insert sessions" ON diagnosis_sessions;
        DROP POLICY IF EXISTS "anonymous_update_sessions" ON diagnosis_sessions;
        DROP POLICY IF EXISTS "Anonymous update sessions" ON diagnosis_sessions;
        
        -- 読み取り権限
        CREATE POLICY "anonymous_read_diagnosis_sessions" ON diagnosis_sessions
        FOR SELECT TO anon 
        USING (true);
        
        -- 挿入権限
        CREATE POLICY "anonymous_insert_diagnosis_sessions" ON diagnosis_sessions
        FOR INSERT TO anon 
        WITH CHECK (true);
        
        -- 更新権限（自分のセッションのみ）
        CREATE POLICY "anonymous_update_diagnosis_sessions" ON diagnosis_sessions
        FOR UPDATE TO anon 
        USING (true)
        WITH CHECK (true);
        
        -- 基本権限を付与
        GRANT SELECT, INSERT, UPDATE ON diagnosis_sessions TO anon;
        GRANT SELECT, INSERT, UPDATE ON diagnosis_sessions TO authenticated;
        
        RAISE NOTICE '✅ diagnosis_sessions の匿名アクセス権限を設定';
    END IF;
END $$;

-- Step 5: 修正結果の確認
SELECT 
    '=== 修正後のポリシー一覧 ===' as info,
    tablename, 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('homepage_content_settings', 'legal_links', 'financial_products', 'financial_planners', 'expert_contact_settings', 'admin_settings')
ORDER BY tablename, policyname;

-- Step 6: 権限確認
SELECT 
    '=== 匿名ユーザー権限確認 ===' as info,
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee = 'anon'
AND table_name IN ('homepage_content_settings', 'legal_links', 'financial_products', 'financial_planners', 'expert_contact_settings', 'admin_settings')
ORDER BY table_name, privilege_type;

-- 完了メッセージ
SELECT '🎉 匿名アクセスポリシー修正完了 - 401エラー解決' as final_message;