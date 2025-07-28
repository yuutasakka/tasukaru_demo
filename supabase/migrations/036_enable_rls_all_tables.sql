-- ============================================
-- RLSセキュリティ修正マイグレーション
-- 全てのpublicテーブルでRLSを有効化
-- ============================================

-- 1. RLSポリシーが既に存在するテーブルでRLSを有効化
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sms_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_verification ENABLE ROW LEVEL SECURITY;

-- 2. RLSポリシーが存在しないテーブルでRLSを有効化し、適切なポリシーを作成
-- analytics_settings
ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only analytics settings" ON public.analytics_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid()::text = user_id);

-- notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON public.notification_settings
  FOR ALL USING (auth.uid()::text = user_id);

-- testimonials
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read testimonials" ON public.testimonials
  FOR SELECT USING (true);
CREATE POLICY "Admin manage testimonials" ON public.testimonials
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- product_settings
ALTER TABLE public.product_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product settings" ON public.product_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin manage product settings" ON public.product_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- pending_admin_approvals
ALTER TABLE public.pending_admin_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only pending approvals" ON public.pending_admin_approvals
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- admin_approval_history
ALTER TABLE public.admin_approval_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only approval history" ON public.admin_approval_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- affiliate_products
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read affiliate products" ON public.affiliate_products
  FOR SELECT USING (true);
CREATE POLICY "Admin manage affiliate products" ON public.affiliate_products
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pricing plans" ON public.pricing_plans
  FOR SELECT USING (true);
CREATE POLICY "Admin manage pricing plans" ON public.pricing_plans
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admin manage all subscriptions" ON public.subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admin view all payments" ON public.payment_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- user_usage_logs
ALTER TABLE public.user_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON public.user_usage_logs
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admin view all usage" ON public.user_usage_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Admin manage all profiles" ON public.user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only sessions" ON public.admin_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- secure_config
ALTER TABLE public.secure_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only secure config" ON public.secure_config
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- security_settings
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only security settings" ON public.security_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. 一時的な匿名アクセス用ポリシー（既存のアプリケーション動作を維持）
-- 注意: これらは開発中の一時的な対策です。本番環境では適切な認証を実装してください。

-- SMS認証関連（匿名アクセス許可）
CREATE POLICY "Temporary anonymous SMS access" ON public.sms_verification
  FOR ALL USING (true)
  WITH CHECK (true);

-- 診断セッション（既存のポリシーを確認）
-- 既にanonymous_insert_diagnosis_sessions, anonymous_read_diagnosis_sessions, anonymous_update_diagnosis_sessionsが存在

-- 4. 検証クエリ - RLSが有効になっているか確認
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

-- 5. 管理者認証情報のRLSポリシー更新（より厳格に）
DROP POLICY IF EXISTS "Admin only access credentials" ON public.admin_credentials;
CREATE POLICY "Service role only admin credentials" ON public.admin_credentials
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. 監査ログのRLSポリシー更新（読み取り専用を追加）
CREATE POLICY "Admin read audit logs" ON public.audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.admin_credentials
      WHERE username = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- 7. コメント追加（ドキュメント化）
COMMENT ON POLICY "Service role only admin credentials" ON public.admin_credentials 
  IS '管理者認証情報はservice_roleのみアクセス可能';
COMMENT ON POLICY "Admin read audit logs" ON public.audit_logs 
  IS '監査ログは管理者のみ読み取り可能';
COMMENT ON POLICY "Temporary anonymous SMS access" ON public.sms_verification 
  IS '一時的な匿名アクセス許可 - 本番環境では要変更';