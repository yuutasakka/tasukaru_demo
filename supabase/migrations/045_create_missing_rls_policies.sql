-- ============================================
-- Missing RLS Policies Creation (FINAL VERSION)
-- ============================================
-- Based on actual table structures
-- ============================================

-- Admin Approval History
CREATE POLICY "Admin only approval history" ON public.admin_approval_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admin Sessions
CREATE POLICY "Admin only sessions" ON public.admin_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Affiliate Products
CREATE POLICY "Public read affiliate products" ON public.affiliate_products
  FOR SELECT USING (true);
CREATE POLICY "Admin manage affiliate products" ON public.affiliate_products
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Analytics Settings
CREATE POLICY "Admin only analytics settings" ON public.analytics_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Notification Settings (no user_id column - admin only)
CREATE POLICY "Admin only notification settings" ON public.notification_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Payment History (has user_id)
CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage all payments" ON public.payment_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Pending Admin Approvals
CREATE POLICY "Admin only pending approvals" ON public.pending_admin_approvals
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Pricing Plans
CREATE POLICY "Public read pricing plans" ON public.pricing_plans
  FOR SELECT USING (true);
CREATE POLICY "Admin manage pricing plans" ON public.pricing_plans
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Product Settings
CREATE POLICY "Public read product settings" ON public.product_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin manage product settings" ON public.product_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Secure Config
CREATE POLICY "Admin only secure config" ON public.secure_config
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Security Settings
CREATE POLICY "Admin only security settings" ON public.security_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Subscriptions (has user_id)
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage all subscriptions" ON public.subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Testimonials
CREATE POLICY "Public read testimonials" ON public.testimonials
  FOR SELECT USING (true);
CREATE POLICY "Admin manage testimonials" ON public.testimonials
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User Profiles (no user_id, uses id as primary key)
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin manage all profiles" ON public.user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User Sessions (phone_number based, no user_id)
CREATE POLICY "Admin only user sessions" ON public.user_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User Usage Logs (has user_id)
CREATE POLICY "Users can view own usage" ON public.user_usage_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin view all usage" ON public.user_usage_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Verification Query
-- ============================================

-- Check all tables now have policies
SELECT 
    t.schemaname,
    t.tablename,
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
    END as has_policies,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
AND c.relrowsecurity = true
GROUP BY t.schemaname, t.tablename, c.relrowsecurity
ORDER BY has_policies, t.tablename;