-- ============================================
-- Fix function search_path security warnings (SAFE VERSION)
-- ============================================
-- This migration sets explicit search_path for functions that exist
-- Uses conditional checks to avoid errors for missing functions
-- ============================================

-- Helper function to check if a function exists
DO $$
DECLARE
    func_name text;
    func_params text;
BEGIN
    -- Array of functions to update with their signatures
    -- Format: 'function_name|param1_type,param2_type'
    FOR func_name, func_params IN VALUES
        ('update_registration_requests_updated_at', ''),
        ('check_otp_expiry', ''),
        ('cleanup_expired_sms_verification', ''),
        ('update_diagnosis_sessions_updated_at', ''),
        ('sync_verification_fields', ''),
        ('expire_old_otps', ''),
        ('update_modified_time', ''),
        ('update_admins_updated_at', ''),
        ('update_updated_at_column', ''),
        ('update_admin_registrations_updated_at', ''),
        ('increment_attempts', 'text'),
        ('cleanup_expired_otps', ''),
        ('check_sms_rate_limit', 'text,inet'),
        ('update_admin_timestamp', ''),
        ('update_security_trust_settings_updated_at', ''),
        ('handle_new_user', ''),
        ('cleanup_old_data', ''),
        ('update_security_timestamp', '')
    LOOP
        -- Check if function exists before trying to alter it
        IF EXISTS (
            SELECT 1 
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' 
            AND p.proname = func_name
        ) THEN
            -- Build and execute the ALTER FUNCTION statement
            IF func_params = '' THEN
                EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_catalog', func_name);
                RAISE NOTICE 'Updated search_path for function: %', func_name;
            ELSE
                -- For functions with parameters, we need to match the exact signature
                -- This is a simplified approach - in production you'd want more sophisticated matching
                CASE func_name
                    WHEN 'increment_attempts' THEN
                        EXECUTE 'ALTER FUNCTION public.increment_attempts(text) SET search_path = public, pg_catalog';
                    WHEN 'check_sms_rate_limit' THEN
                        EXECUTE 'ALTER FUNCTION public.check_sms_rate_limit(text, inet) SET search_path = public, pg_catalog';
                    ELSE
                        RAISE NOTICE 'Skipping function with parameters: %', func_name;
                END CASE;
            END IF;
        ELSE
            RAISE NOTICE 'Function not found, skipping: %', func_name;
        END IF;
    END LOOP;

    -- Handle functions that might have different signatures
    -- secure_admin_login
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'secure_admin_login'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.secure_admin_login(text, text) SET search_path = public, pg_catalog';
        RAISE NOTICE 'Updated search_path for function: secure_admin_login';
    END IF;

    -- set_current_phone
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'set_current_phone'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.set_current_phone(text) SET search_path = public, pg_catalog';
        RAISE NOTICE 'Updated search_path for function: set_current_phone';
    END IF;

    -- update_admin_registration_status (with 4 parameters)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'update_admin_registration_status'
    ) THEN
        BEGIN
            EXECUTE 'ALTER FUNCTION public.update_admin_registration_status(uuid, text, text, text) SET search_path = public, pg_catalog';
            RAISE NOTICE 'Updated search_path for function: update_admin_registration_status';
        EXCEPTION WHEN undefined_function THEN
            -- Try with 2 parameters
            EXECUTE 'ALTER FUNCTION public.update_admin_registration_status(uuid, text) SET search_path = public, pg_catalog';
            RAISE NOTICE 'Updated search_path for function: update_admin_registration_status (2 params)';
        END;
    END IF;
END $$;

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