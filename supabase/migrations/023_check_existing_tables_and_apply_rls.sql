-- 既存テーブル確認とRLS適用 - エラー回避版
-- 2024年12月17日

-- ステップ1: 現在のテーブル一覧を確認
SELECT 
    tablename,
    schemaname,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ステップ2: 既存のポリシーを安全に削除
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- 既存のポリシーを動的に削除
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, policy_record.tablename);
            RAISE NOTICE 'Dropped policy: % on table: %', policy_record.policyname, policy_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to drop policy: % on table: % (Error: %)', policy_record.policyname, policy_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ステップ3: 存在するテーブルにのみRLSを設定
DO $$
DECLARE
    table_record RECORD;
    table_exists BOOLEAN;
BEGIN
    -- 主要なテーブルリスト
    FOR table_record IN 
        VALUES 
            ('legal_links'),
            ('homepage_content_settings'),
            ('admin_settings'),
            ('financial_planners'),
            ('financial_products'),
            ('diagnosis_sessions'),
            ('admin_credentials'),
            ('admin_login_attempts'),
            ('audit_logs'),
            ('sms_verification'),
            ('registration_requests'),
            ('password_history'),
            ('admin_email_verification'),
            ('admin_sms_verification')
    LOOP
        -- テーブルの存在確認
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_record.column1
        ) INTO table_exists;
        
        IF table_exists THEN
            BEGIN
                -- RLSを有効化
                EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.column1);
                RAISE NOTICE 'RLS enabled for table: %', table_record.column1;
                
                -- テーブル別のポリシー適用
                CASE table_record.column1
                    WHEN 'legal_links' THEN
                        EXECUTE 'CREATE POLICY "Public read active legal links" ON legal_links FOR SELECT TO anon, authenticated USING (is_active = true)';
                        
                    WHEN 'homepage_content_settings' THEN
                        EXECUTE 'CREATE POLICY "Public read active homepage settings" ON homepage_content_settings FOR SELECT TO anon, authenticated USING (is_active = true)';
                        
                    WHEN 'admin_settings' THEN
                        EXECUTE 'CREATE POLICY "Public read safe admin settings" ON admin_settings FOR SELECT TO anon, authenticated USING (setting_key IN (''testimonials'', ''public_announcements'', ''site_maintenance''))';
                        
                    WHEN 'financial_planners' THEN
                        EXECUTE 'CREATE POLICY "Public read active planners" ON financial_planners FOR SELECT TO anon, authenticated USING (is_active = true)';
                        
                    WHEN 'financial_products' THEN
                        EXECUTE 'CREATE POLICY "Public read active products" ON financial_products FOR SELECT TO anon, authenticated USING (is_active = true)';
                        
                    WHEN 'diagnosis_sessions' THEN
                        EXECUTE 'CREATE POLICY "Anonymous access sessions" ON diagnosis_sessions FOR SELECT TO anon USING (true)';
                        EXECUTE 'CREATE POLICY "Anonymous insert sessions" ON diagnosis_sessions FOR INSERT TO anon WITH CHECK (true)';
                        EXECUTE 'CREATE POLICY "Anonymous update sessions" ON diagnosis_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true)';
                        
                    WHEN 'admin_credentials' THEN
                        EXECUTE 'CREATE POLICY "Admin only access credentials" ON admin_credentials FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
                        
                    WHEN 'admin_login_attempts' THEN
                        EXECUTE 'CREATE POLICY "Admin only access login attempts" ON admin_login_attempts FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
                        
                    WHEN 'audit_logs' THEN
                        EXECUTE 'CREATE POLICY "Admin only access audit logs" ON audit_logs FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
                        
                    WHEN 'sms_verification' THEN
                        EXECUTE 'CREATE POLICY "SMS verification access" ON sms_verification FOR ALL TO anon, authenticated USING (true)';
                        
                    WHEN 'registration_requests' THEN
                        EXECUTE 'CREATE POLICY "Admin read registration requests" ON registration_requests FOR SELECT TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'')';
                        EXECUTE 'CREATE POLICY "Public insert registration requests" ON registration_requests FOR INSERT TO anon, authenticated WITH CHECK (true)';
                        
                    WHEN 'password_history' THEN
                        EXECUTE 'CREATE POLICY "Admin only password history" ON password_history FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
                        
                    WHEN 'admin_email_verification' THEN
                        EXECUTE 'CREATE POLICY "Admin only email verification" ON admin_email_verification FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
                        
                    WHEN 'admin_sms_verification' THEN
                        EXECUTE 'CREATE POLICY "Admin only sms verification" ON admin_sms_verification FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
                        
                    ELSE
                        RAISE NOTICE 'No specific policy defined for table: %', table_record.column1;
                END CASE;
                
                RAISE NOTICE 'Policies applied for table: %', table_record.column1;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to apply RLS/policies for table: % (Error: %)', table_record.column1, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Table does not exist, skipping: %', table_record.column1;
        END IF;
    END LOOP;
END $$;

-- ステップ4: 結果確認
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ステップ5: 適用されたポリシー一覧
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Smart RLS policies applied to existing tables only' as status;