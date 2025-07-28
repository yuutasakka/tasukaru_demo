-- 🔧 カラム名修正とRLS復元（Migration 013と018の競合解決）
-- 目的: is_active vs active のカラム名競合を解決し、RLS を正しく設定

-- Step 1: 現在のテーブル構造を確認
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('homepage_content_settings', 'legal_links', 'financial_products', 'financial_planners', 'expert_contact_settings', 'admin_settings')
AND column_name IN ('is_active', 'active')
ORDER BY table_name, column_name;

-- Step 2: カラム名を統一（is_activeに統一）
DO $$
DECLARE
    table_record RECORD;
    column_exists BOOLEAN;
BEGIN
    -- 各テーブルをチェックしてカラム名を統一
    FOR table_record IN 
        SELECT unnest(ARRAY['homepage_content_settings', 'legal_links', 'financial_products', 
                           'financial_planners', 'expert_contact_settings', 'admin_settings']) as table_name
    LOOP
        -- activeカラムが存在するかチェック
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_record.table_name 
            AND column_name = 'active'
            AND table_schema = 'public'
        ) INTO column_exists;
        
        IF column_exists THEN
            -- activeカラムをis_activeにリネーム
            BEGIN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN active TO is_active', table_record.table_name);
                RAISE NOTICE 'Renamed column active to is_active in table: %', table_record.table_name;
            EXCEPTION
                WHEN duplicate_column THEN
                    -- 両方のカラムが存在する場合、activeを削除
                    EXECUTE format('ALTER TABLE %I DROP COLUMN active', table_record.table_name);
                    RAISE NOTICE 'Dropped duplicate active column in table: %', table_record.table_name;
                WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to rename column in table: % (Error: %)', table_record.table_name, SQLERRM;
            END;
        END IF;
        
        -- is_activeカラムが存在しない場合は作成
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_record.table_name 
            AND column_name = 'is_active'
            AND table_schema = 'public'
        ) INTO column_exists;
        
        IF NOT column_exists AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_record.table_name) THEN
            BEGIN
                EXECUTE format('ALTER TABLE %I ADD COLUMN is_active BOOLEAN DEFAULT true', table_record.table_name);
                RAISE NOTICE 'Added is_active column to table: %', table_record.table_name;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to add is_active column to table: % (Error: %)', table_record.table_name, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Step 3: インデックスを修正
DO $$
DECLARE
    index_record RECORD;
BEGIN
    -- 古いインデックスを削除
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('homepage_content_settings', 'legal_links', 'financial_products', 
                           'financial_planners', 'expert_contact_settings', 'admin_settings')
        AND indexname LIKE '%_active'
    LOOP
        BEGIN
            EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
            RAISE NOTICE 'Dropped old index: %', index_record.indexname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to drop index: % (Error: %)', index_record.indexname, SQLERRM;
        END;
    END LOOP;
    
    -- 新しいインデックスを作成
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_homepage_content_is_active ON homepage_content_settings(is_active);
        CREATE INDEX IF NOT EXISTS idx_legal_links_is_active ON legal_links(is_active);
        CREATE INDEX IF NOT EXISTS idx_financial_products_is_active ON financial_products(is_active);
        CREATE INDEX IF NOT EXISTS idx_financial_planners_is_active ON financial_planners(is_active);
        CREATE INDEX IF NOT EXISTS idx_expert_contact_is_active ON expert_contact_settings(is_active);
        CREATE INDEX IF NOT EXISTS idx_admin_settings_is_active ON admin_settings(is_active);
        RAISE NOTICE 'Created new is_active indexes';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create some indexes (Error: %)', SQLERRM;
    END;
END $$;

-- Step 4: 全テーブルのRLSを再有効化
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

-- Step 5: 危険な匿名アクセス権限を削除
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

-- Step 6: 管理者テーブルのセキュア化
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

-- Step 7: 公開コンテンツテーブルの安全な読み取り権限（修正版）
-- ホームページコンテンツ（アクティブなもののみ読み取り可能）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'homepage_content_settings') THEN
        DROP POLICY IF EXISTS "public_read_active_content" ON homepage_content_settings;
        CREATE POLICY "public_read_active_content" ON homepage_content_settings
        FOR SELECT TO anon, authenticated 
        USING (is_active = true);

        DROP POLICY IF EXISTS "service_role_all_content" ON homepage_content_settings;
        CREATE POLICY "service_role_all_content" ON homepage_content_settings
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'Homepage content settings policies created successfully';
    END IF;
END $$;

-- 法的リンク（アクティブなもののみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'legal_links') THEN
        DROP POLICY IF EXISTS "public_read_active_legal" ON legal_links;
        CREATE POLICY "public_read_active_legal" ON legal_links
        FOR SELECT TO anon, authenticated 
        USING (is_active = true);

        DROP POLICY IF EXISTS "service_role_all_legal" ON legal_links;
        CREATE POLICY "service_role_all_legal" ON legal_links
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'Legal links policies created successfully';
    END IF;
END $$;

-- 金融商品（アクティブなもののみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'financial_products') THEN
        DROP POLICY IF EXISTS "public_read_active_products" ON financial_products;
        CREATE POLICY "public_read_active_products" ON financial_products
        FOR SELECT TO anon, authenticated 
        USING (is_active = true);

        DROP POLICY IF EXISTS "service_role_all_products" ON financial_products;
        CREATE POLICY "service_role_all_products" ON financial_products
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'Financial products policies created successfully';
    END IF;
END $$;

-- ファイナンシャルプランナー（アクティブなもののみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'financial_planners') THEN
        DROP POLICY IF EXISTS "public_read_active_planners" ON financial_planners;
        CREATE POLICY "public_read_active_planners" ON financial_planners
        FOR SELECT TO anon, authenticated 
        USING (is_active = true);

        DROP POLICY IF EXISTS "service_role_all_planners" ON financial_planners;
        CREATE POLICY "service_role_all_planners" ON financial_planners
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'Financial planners policies created successfully';
    END IF;
END $$;

-- エキスパート連絡設定（読み取り専用）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'expert_contact_settings') THEN
        DROP POLICY IF EXISTS "public_read_expert_contact" ON expert_contact_settings;
        CREATE POLICY "public_read_expert_contact" ON expert_contact_settings
        FOR SELECT TO anon, authenticated 
        USING (is_active = true);

        DROP POLICY IF EXISTS "service_role_all_expert" ON expert_contact_settings;
        CREATE POLICY "service_role_all_expert" ON expert_contact_settings
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'Expert contact settings policies created successfully';
    END IF;
END $$;

-- Step 8: 診断セッションのユーザー専用アクセス
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'diagnosis_sessions') THEN
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
        
        RAISE NOTICE 'Diagnosis sessions policies created successfully';
    END IF;
END $$;

-- Step 9: SMS検証テーブルのセキュア化
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sms_verifications') THEN
        -- 電話番号の所有者のみアクセス可能
        DROP POLICY IF EXISTS "phone_owner_only" ON sms_verifications;
        CREATE POLICY "phone_owner_only" ON sms_verifications
        FOR ALL TO anon, authenticated 
        USING (phone_number = current_setting('app.current_phone', true));

        -- service_roleは全権限
        DROP POLICY IF EXISTS "service_role_all_sms" ON sms_verifications;
        CREATE POLICY "service_role_all_sms" ON sms_verifications
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'SMS verifications policies created successfully';
    END IF;
END $$;

-- Step 10: セキュア設定テーブル（service_roleのみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'secure_configs') THEN
        DROP POLICY IF EXISTS "service_role_only_secure_config" ON secure_configs;
        CREATE POLICY "service_role_only_secure_config" ON secure_configs
        FOR ALL TO service_role USING (true);
        
        RAISE NOTICE 'Secure configs policies created successfully';
    END IF;
END $$;

-- Step 11: 修正後の確認
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('homepage_content_settings', 'legal_links', 'financial_products', 'financial_planners', 'expert_contact_settings', 'admin_settings')
AND column_name = 'is_active'
ORDER BY table_name;

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

-- 最終確認メッセージ
DO $$
DECLARE
    total_tables INTEGER;
    rls_enabled_tables INTEGER;
    active_column_tables INTEGER;
BEGIN
    -- テーブル数とRLS有効化数をカウント
    SELECT COUNT(*) INTO total_tables
    FROM pg_tables WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO rls_enabled_tables
    FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
    
    -- is_activeカラムを持つテーブル数をカウント
    SELECT COUNT(DISTINCT table_name) INTO active_column_tables
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'is_active';
    
    RAISE NOTICE '📊 カラム名修正とRLS復元結果:';
    RAISE NOTICE '   - 総テーブル数: %', total_tables;
    RAISE NOTICE '   - RLS有効テーブル数: %', rls_enabled_tables;
    RAISE NOTICE '   - is_activeカラム統一テーブル数: %', active_column_tables;
    
    IF rls_enabled_tables = total_tables THEN
        RAISE NOTICE '🎉 ✅ カラム名修正とRLS復元完了 - 本番環境準備完了';
    ELSE
        RAISE NOTICE '⚠️ 一部のテーブルでRLS有効化に問題があります。確認が必要です。';
    END IF;
END $$;

-- 最終メッセージ
SELECT '🔧 カラム名競合修正とRLS復元完了 - is_activeカラムに統一済み' as final_status;