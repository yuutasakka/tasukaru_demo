-- ============================================
-- Fix function search_path security warnings
-- ============================================
-- This migration sets explicit search_path for all functions
-- to prevent search_path hijacking attacks.
-- ============================================

-- update_registration_requests_updated_at
ALTER FUNCTION public.update_registration_requests_updated_at()
SET search_path = public, pg_catalog;

-- check_otp_expiry
ALTER FUNCTION public.check_otp_expiry()
SET search_path = public, pg_catalog;

-- cleanup_expired_sms_verification
ALTER FUNCTION public.cleanup_expired_sms_verification()
SET search_path = public, pg_catalog;

-- update_diagnosis_sessions_updated_at
ALTER FUNCTION public.update_diagnosis_sessions_updated_at()
SET search_path = public, pg_catalog;

-- sync_verification_fields
ALTER FUNCTION public.sync_verification_fields()
SET search_path = public, pg_catalog;

-- expire_old_otps
ALTER FUNCTION public.expire_old_otps()
SET search_path = public, pg_catalog;

-- update_modified_time
ALTER FUNCTION public.update_modified_time()
SET search_path = public, pg_catalog;

-- update_admins_updated_at
ALTER FUNCTION public.update_admins_updated_at()
SET search_path = public, pg_catalog;

-- update_updated_at_column
ALTER FUNCTION public.update_updated_at_column()
SET search_path = public, pg_catalog;

-- update_admin_registrations_updated_at
ALTER FUNCTION public.update_admin_registrations_updated_at()
SET search_path = public, pg_catalog;

-- increment_attempts
ALTER FUNCTION public.increment_attempts(phone TEXT)
SET search_path = public, pg_catalog;

-- cleanup_expired_otps
ALTER FUNCTION public.cleanup_expired_otps()
SET search_path = public, pg_catalog;

-- check_sms_rate_limit
ALTER FUNCTION public.check_sms_rate_limit(phone text, ip_addr inet)
SET search_path = public, pg_catalog;

-- 追加の関数
-- authenticate_admin (コメントアウト - 関数が見つからない場合はスキップ)
-- ALTER FUNCTION public.authenticate_admin(username_param text, password_param text)
-- SET search_path = public, pg_catalog;

-- create_profile_for_user
ALTER FUNCTION public.create_profile_for_user()
SET search_path = public, pg_catalog;

-- log_user_activity
ALTER FUNCTION public.log_user_activity()
SET search_path = public, pg_catalog;

-- secure_admin_login
ALTER FUNCTION public.secure_admin_login(username_param text, password_param text)
SET search_path = public, pg_catalog;

-- set_current_phone
ALTER FUNCTION public.set_current_phone(phone_text text)
SET search_path = public, pg_catalog;

-- update_admin_registration_status
ALTER FUNCTION public.update_admin_registration_status(request_id uuid, new_status text, admin_notes text, reviewed_by_admin text)
SET search_path = public, pg_catalog;

-- update_admin_timestamp
ALTER FUNCTION public.update_admin_timestamp()
SET search_path = public, pg_catalog;

-- update_security_trust_settings_updated_at
ALTER FUNCTION public.update_security_trust_settings_updated_at()
SET search_path = public, pg_catalog;

-- handle_new_user
ALTER FUNCTION public.handle_new_user()
SET search_path = public, pg_catalog;

-- cleanup_old_data
ALTER FUNCTION public.cleanup_old_data()
SET search_path = public, pg_catalog;

-- update_security_timestamp
ALTER FUNCTION public.update_security_timestamp()
SET search_path = public, pg_catalog;

-- ============================================
-- 確認: search_pathが設定されていない関数を検出
-- ============================================

SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosecdef THEN 'DEFINER'
        ELSE 'INVOKER'
    END as security,
    COALESCE(p.proconfig::text, 'NOT SET') as config,
    CASE 
        WHEN p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path%') THEN 'MISSING'
        ELSE 'SET'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND (p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path%'))
ORDER BY p.proname;