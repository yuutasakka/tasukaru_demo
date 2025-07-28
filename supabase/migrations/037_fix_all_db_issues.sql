-- ============================================
-- 包括的なデータベース修正マイグレーション
-- 1. RLSセキュリティ修正
-- 2. Auth RLS最適化
-- 3. 重複インデックス削除
-- ============================================

-- 1. RLSポリシーが既に存在するテーブルでRLSを有効化
ALTER TABLE IF EXISTS public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_sms_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sms_verification ENABLE ROW LEVEL SECURITY;

-- 2. RLSポリシーが存在しないテーブルでRLSを有効化し、適切なポリシーを作成
-- analytics_settings
ALTER TABLE IF EXISTS public.analytics_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only analytics settings" ON public.analytics_settings;
CREATE POLICY "Admin only analytics settings" ON public.analytics_settings
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- user_sessions
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own sessions" ON public.user_sessions;
CREATE POLICY "Users can access own sessions" ON public.user_sessions
  FOR ALL USING ((SELECT auth.uid())::text = user_id);

-- notification_settings
ALTER TABLE IF EXISTS public.notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notification_settings;
CREATE POLICY "Users can manage own notifications" ON public.notification_settings
  FOR ALL USING ((SELECT auth.uid())::text = user_id);

-- testimonials
ALTER TABLE IF EXISTS public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admin manage testimonials" ON public.testimonials;
CREATE POLICY "Public read testimonials" ON public.testimonials
  FOR SELECT USING (true);
CREATE POLICY "Admin manage testimonials" ON public.testimonials
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- product_settings
ALTER TABLE IF EXISTS public.product_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product settings" ON public.product_settings;
DROP POLICY IF EXISTS "Admin manage product settings" ON public.product_settings;
CREATE POLICY "Public read product settings" ON public.product_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin manage product settings" ON public.product_settings
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- pending_admin_approvals
ALTER TABLE IF EXISTS public.pending_admin_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only pending approvals" ON public.pending_admin_approvals;
CREATE POLICY "Admin only pending approvals" ON public.pending_admin_approvals
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- admin_approval_history
ALTER TABLE IF EXISTS public.admin_approval_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only approval history" ON public.admin_approval_history;
CREATE POLICY "Admin only approval history" ON public.admin_approval_history
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- affiliate_products
ALTER TABLE IF EXISTS public.affiliate_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read affiliate products" ON public.affiliate_products;
DROP POLICY IF EXISTS "Admin manage affiliate products" ON public.affiliate_products;
CREATE POLICY "Public read affiliate products" ON public.affiliate_products
  FOR SELECT USING (true);
CREATE POLICY "Admin manage affiliate products" ON public.affiliate_products
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- pricing_plans
ALTER TABLE IF EXISTS public.pricing_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read pricing plans" ON public.pricing_plans;
DROP POLICY IF EXISTS "Admin manage pricing plans" ON public.pricing_plans;
CREATE POLICY "Public read pricing plans" ON public.pricing_plans
  FOR SELECT USING (true);
CREATE POLICY "Admin manage pricing plans" ON public.pricing_plans
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- subscriptions
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING ((SELECT auth.uid())::text = user_id);
CREATE POLICY "Admin manage all subscriptions" ON public.subscriptions
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- payment_history
ALTER TABLE IF EXISTS public.payment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payment_history;
DROP POLICY IF EXISTS "Admin view all payments" ON public.payment_history;
CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT USING ((SELECT auth.uid())::text = user_id);
CREATE POLICY "Admin view all payments" ON public.payment_history
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- user_usage_logs
ALTER TABLE IF EXISTS public.user_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage_logs;
DROP POLICY IF EXISTS "Admin view all usage" ON public.user_usage_logs;
CREATE POLICY "Users can view own usage" ON public.user_usage_logs
  FOR SELECT USING ((SELECT auth.uid())::text = user_id);
CREATE POLICY "Admin view all usage" ON public.user_usage_logs
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- user_profiles
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin manage all profiles" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING ((SELECT auth.uid())::text = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING ((SELECT auth.uid())::text = user_id);
CREATE POLICY "Admin manage all profiles" ON public.user_profiles
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- admin_sessions
ALTER TABLE IF EXISTS public.admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only sessions" ON public.admin_sessions;
CREATE POLICY "Admin only sessions" ON public.admin_sessions
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- secure_config
ALTER TABLE IF EXISTS public.secure_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only secure config" ON public.secure_config;
CREATE POLICY "Admin only secure config" ON public.secure_config
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- security_settings
ALTER TABLE IF EXISTS public.security_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only security settings" ON public.security_settings;
CREATE POLICY "Admin only security settings" ON public.security_settings
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- 3. sms_verificationsテーブルのRLS最適化
-- 既存のポリシーを削除して最適化されたバージョンに置き換え
DROP POLICY IF EXISTS "Service role only" ON public.sms_verification;
DROP POLICY IF EXISTS "Temporary anonymous SMS access" ON public.sms_verification;

-- 最適化されたポリシーを作成
CREATE POLICY "Service role only" ON public.sms_verification
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- 一時的な匿名アクセス用ポリシー（開発環境用）
CREATE POLICY "Temporary anonymous SMS access" ON public.sms_verification
  FOR ALL USING (true)
  WITH CHECK (true);

-- 4. 管理者認証情報のRLSポリシー更新（より厳格に）
DROP POLICY IF EXISTS "Admin only access credentials" ON public.admin_credentials;
DROP POLICY IF EXISTS "Service role only admin credentials" ON public.admin_credentials;
CREATE POLICY "Service role only admin credentials" ON public.admin_credentials
  FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- 5. 監査ログのRLSポリシー更新（読み取り専用を追加）
DROP POLICY IF EXISTS "Admin read audit logs" ON public.audit_logs;
CREATE POLICY "Admin read audit logs" ON public.audit_logs
  FOR SELECT USING (
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.admin_credentials
      WHERE username = (SELECT auth.jwt() ->> 'email')
      AND is_active = true
    )
  );

-- 6. 重複インデックスの削除
-- homepage_content_settingsテーブルの重複インデックスを削除
DROP INDEX IF EXISTS public.idx_homepage_content_key;
-- idx_homepage_content_settings_keyは残す

-- 7. 検証クエリ - RLSが有効になっているか確認
DO $$
DECLARE
  table_record RECORD;
  rls_disabled_count INTEGER := 0;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
      AND c.relname = table_record.tablename
      AND c.relrowsecurity = true
    ) THEN
      RAISE NOTICE 'Table % still has RLS disabled', table_record.tablename;
      rls_disabled_count := rls_disabled_count + 1;
    END IF;
  END LOOP;
  
  IF rls_disabled_count > 0 THEN
    RAISE WARNING '% tables still have RLS disabled', rls_disabled_count;
  ELSE
    RAISE NOTICE 'All tables have RLS enabled successfully';
  END IF;
END;
$$;

-- 8. コメント追加（ドキュメント化）
COMMENT ON POLICY "Service role only admin credentials" ON public.admin_credentials 
  IS '管理者認証情報はservice_roleのみアクセス可能';
COMMENT ON POLICY "Admin read audit logs" ON public.audit_logs 
  IS '監査ログは管理者のみ読み取り可能';
COMMENT ON POLICY "Temporary anonymous SMS access" ON public.sms_verification 
  IS '一時的な匿名アクセス許可 - 本番環境では要変更';

-- 9. 追加の最適化: sms_verificationsテーブルが存在しない場合の対処
-- （テーブル名が異なる可能性があるため）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_verifications') THEN
    ALTER TABLE public.sms_verifications ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Service role only" ON public.sms_verifications;
    CREATE POLICY "Service role only" ON public.sms_verifications
      FOR ALL USING ((SELECT auth.jwt() ->> 'role') = 'service_role');
    
    DROP POLICY IF EXISTS "Temporary anonymous SMS access" ON public.sms_verifications;
    CREATE POLICY "Temporary anonymous SMS access" ON public.sms_verifications
      FOR ALL USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;