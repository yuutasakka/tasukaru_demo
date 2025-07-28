-- ============================================
-- Missing RLS Policies Creation (DEBUG VERSION)
-- ============================================
-- This version shows exactly which tables exist and what columns they have
-- ============================================

-- First, let's see what tables actually exist and their columns
SELECT 
    t.table_name,
    string_agg(c.column_name, ', ' ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_schema = c.table_schema 
    AND t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN (
    'admin_approval_history',
    'admin_sessions',
    'affiliate_products',
    'analytics_settings',
    'notification_settings',
    'payment_history',
    'pending_admin_approvals',
    'pricing_plans',
    'product_settings',
    'secure_config',
    'security_settings',
    'subscriptions',
    'testimonials',
    'profiles',
    'user_profiles',
    'user_sessions',
    'user_usage_logs'
)
GROUP BY t.table_name
ORDER BY t.table_name;

-- Now let's check which tables have RLS enabled but no policies
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
AND c.relrowsecurity = true  -- RLS is enabled
AND NOT EXISTS (              -- But no policies exist
    SELECT 1 
    FROM pg_policies p 
    WHERE p.schemaname = t.schemaname 
    AND p.tablename = t.tablename
)
ORDER BY t.tablename;