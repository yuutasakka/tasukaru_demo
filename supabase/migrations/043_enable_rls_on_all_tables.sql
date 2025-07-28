-- ============================================
-- Enable RLS on all public schema tables
-- ============================================
-- This migration enables Row Level Security (RLS) on all tables
-- that have policies defined but RLS is not enabled.
-- ============================================

-- 管理者関連テーブル
ALTER TABLE IF EXISTS public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_sms_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pending_admin_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_approval_history ENABLE ROW LEVEL SECURITY;

-- 監査・ログ関連テーブル
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_usage_logs ENABLE ROW LEVEL SECURITY;

-- 診断・金融関連テーブル
ALTER TABLE IF EXISTS public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- 認証・セキュリティ関連テーブル
ALTER TABLE IF EXISTS public.sms_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secure_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secure_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_trust_settings ENABLE ROW LEVEL SECURITY;

-- ユーザー関連テーブル
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 設定関連テーブル
ALTER TABLE IF EXISTS public.analytics_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expert_contact_settings ENABLE ROW LEVEL SECURITY;

-- コンテンツ関連テーブル
ALTER TABLE IF EXISTS public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;

-- 価格・支払い関連テーブル
ALTER TABLE IF EXISTS public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_history ENABLE ROW LEVEL SECURITY;

-- SMS OTP関連テーブル
ALTER TABLE IF EXISTS public.sms_otp_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 確認: RLSが無効なテーブルを検出
-- ============================================

DO $$
DECLARE
    table_rec RECORD;
    rls_disabled_count INTEGER := 0;
BEGIN
    -- RLSが無効なテーブルをチェック
    FOR table_rec IN 
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND NOT EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
            AND c.relname = pg_tables.tablename
            AND c.relrowsecurity = true
        )
    LOOP
        rls_disabled_count := rls_disabled_count + 1;
        RAISE NOTICE 'Table %.% still has RLS disabled', table_rec.schemaname, table_rec.tablename;
    END LOOP;
    
    IF rls_disabled_count = 0 THEN
        RAISE NOTICE 'Success: All tables in public schema have RLS enabled';
    ELSE
        RAISE WARNING 'Warning: % tables still have RLS disabled', rls_disabled_count;
    END IF;
END $$;

-- ============================================
-- レポート: 全テーブルのRLS状態
-- ============================================
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
    CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END,
    t.tablename;