-- ============================================
-- Missing RLS Policies Creation (FIXED VERSION)
-- ============================================
-- This migration creates RLS policies for tables that have RLS enabled
-- but no policies defined, which effectively blocks all access.
-- ============================================

-- Check which tables actually exist before creating policies
DO $$
BEGIN
    -- Admin Approval History
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_approval_history') THEN
        CREATE POLICY "Admin only approval history" ON public.admin_approval_history
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for admin_approval_history';
    END IF;

    -- Admin Sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_sessions') THEN
        CREATE POLICY "Admin only sessions" ON public.admin_sessions
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for admin_sessions';
    END IF;

    -- Affiliate Products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_products') THEN
        CREATE POLICY "Public read affiliate products" ON public.affiliate_products
          FOR SELECT USING (true);
        CREATE POLICY "Admin manage affiliate products" ON public.affiliate_products
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for affiliate_products';
    END IF;

    -- Analytics Settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_settings') THEN
        CREATE POLICY "Admin only analytics settings" ON public.analytics_settings
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for analytics_settings';
    END IF;

    -- Notification Settings (if exists with user_id column)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_settings' 
        AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "Users can manage own notifications" ON public.notification_settings
          FOR ALL USING (auth.uid()::text = user_id);
        RAISE NOTICE 'Created policy for notification_settings';
    END IF;

    -- Payment History (if exists with user_id column)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_history' 
        AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "Users can view own payments" ON public.payment_history
          FOR SELECT USING (auth.uid()::text = user_id);
        CREATE POLICY "Admin view all payments" ON public.payment_history
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for payment_history';
    END IF;

    -- Pending Admin Approvals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_admin_approvals') THEN
        CREATE POLICY "Admin only pending approvals" ON public.pending_admin_approvals
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for pending_admin_approvals';
    END IF;

    -- Pricing Plans
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pricing_plans') THEN
        CREATE POLICY "Public read pricing plans" ON public.pricing_plans
          FOR SELECT USING (true);
        CREATE POLICY "Admin manage pricing plans" ON public.pricing_plans
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for pricing_plans';
    END IF;

    -- Product Settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_settings') THEN
        CREATE POLICY "Public read product settings" ON public.product_settings
          FOR SELECT USING (true);
        CREATE POLICY "Admin manage product settings" ON public.product_settings
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for product_settings';
    END IF;

    -- Secure Config
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'secure_config') THEN
        CREATE POLICY "Admin only secure config" ON public.secure_config
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for secure_config';
    END IF;

    -- Security Settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_settings') THEN
        CREATE POLICY "Admin only security settings" ON public.security_settings
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for security_settings';
    END IF;

    -- Subscriptions (if exists with user_id column)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
          FOR SELECT USING (auth.uid()::text = user_id);
        CREATE POLICY "Admin manage all subscriptions" ON public.subscriptions
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for subscriptions';
    END IF;

    -- Testimonials
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testimonials') THEN
        CREATE POLICY "Public read testimonials" ON public.testimonials
          FOR SELECT USING (true);
        CREATE POLICY "Admin manage testimonials" ON public.testimonials
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for testimonials';
    END IF;

    -- Profiles (not user_profiles) - Fixed table name
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles
          FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Admin manage all profiles" ON public.profiles
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for profiles';
    END IF;

    -- User Sessions (phone_number based, not user_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
        CREATE POLICY "Admin only user sessions" ON public.user_sessions
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policy for user_sessions';
    END IF;

    -- User Usage Logs (if exists with user_id column)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_usage_logs' 
        AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "Users can view own usage" ON public.user_usage_logs
          FOR SELECT USING (auth.uid()::text = user_id);
        CREATE POLICY "Admin view all usage" ON public.user_usage_logs
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        RAISE NOTICE 'Created policies for user_usage_logs';
    END IF;
END $$;

-- ============================================
-- Verification Query
-- ============================================

-- Check all tables now have policies
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN c.relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_policies p 
            WHERE p.schemaname = t.schemaname 
            AND p.tablename = t.tablename
        ) THEN 'YES'
        ELSE 'NO'
    END as has_policies
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE t.schemaname = 'public'
ORDER BY 
    has_policies,
    t.tablename;