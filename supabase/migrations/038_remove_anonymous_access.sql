-- ============================================
-- 匿名アクセスの削除とセキュリティ強化
-- ============================================

-- 1. sms_verificationテーブルの匿名アクセスポリシーを削除
DROP POLICY IF EXISTS "Temporary anonymous SMS access" ON public.sms_verification;

-- 2. 適切な認証ベースのポリシーを作成
-- SMS認証はサービスロールまたは認証済みユーザーのみ
DROP POLICY IF EXISTS "SMS verification authenticated access" ON public.sms_verification;
CREATE POLICY "SMS verification authenticated access" ON public.sms_verification
  FOR ALL USING (
    -- サービスロール、または自分の電話番号のみアクセス可能
    (SELECT auth.jwt() ->> 'role') = 'service_role' OR
    auth.uid() IS NOT NULL
  );

-- 3. sms_verificationsテーブル（複数形）の場合も同様に処理
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_verifications') THEN
    -- 匿名アクセスポリシーを削除
    DROP POLICY IF EXISTS "Temporary anonymous SMS access" ON public.sms_verifications;
    DROP POLICY IF EXISTS "Service role only" ON public.sms_verifications;
    
    -- 認証ベースのポリシーを作成
    CREATE POLICY "SMS verifications authenticated access" ON public.sms_verifications
      FOR ALL USING (
        (SELECT auth.jwt() ->> 'role') = 'service_role' OR
        auth.uid() IS NOT NULL
      );
  END IF;
END;
$$;

-- 4. diagnosis_sessionsテーブルの匿名アクセスポリシーを更新
-- 既存の匿名ポリシーを削除
DROP POLICY IF EXISTS "anonymous_insert_diagnosis_sessions" ON public.diagnosis_sessions;
DROP POLICY IF EXISTS "anonymous_read_diagnosis_sessions" ON public.diagnosis_sessions;
DROP POLICY IF EXISTS "anonymous_update_diagnosis_sessions" ON public.diagnosis_sessions;

-- 新しい認証ベースのポリシーを作成
CREATE POLICY "authenticated_insert_diagnosis_sessions" ON public.diagnosis_sessions
  FOR INSERT WITH CHECK (
    -- 認証済みユーザーまたはサービスロール
    auth.uid() IS NOT NULL OR 
    (SELECT auth.jwt() ->> 'role') = 'service_role'
  );

CREATE POLICY "authenticated_read_diagnosis_sessions" ON public.diagnosis_sessions
  FOR SELECT USING (
    -- 自分のセッションのみ閲覧可能
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
    (SELECT auth.jwt() ->> 'role') = 'service_role'
  );

CREATE POLICY "authenticated_update_diagnosis_sessions" ON public.diagnosis_sessions
  FOR UPDATE USING (
    -- 自分のセッションのみ更新可能
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) OR
    (SELECT auth.jwt() ->> 'role') = 'service_role'
  );

-- 5. その他のテーブルで匿名アクセスを許可している可能性のあるポリシーを確認
-- publicでUSING (true)となっているポリシーを探す
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT 
      schemaname,
      tablename,
      policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND qual = 'true'
    AND policyname NOT LIKE '%public read%'  -- 公開読み取りは除外
  LOOP
    RAISE NOTICE 'Warning: Policy % on table %.% allows unrestricted access', 
      policy_record.policyname, 
      policy_record.schemaname, 
      policy_record.tablename;
  END LOOP;
END;
$$;

-- 6. セキュリティ検証クエリ
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND (
  qual = 'true' OR 
  qual LIKE '%true%' OR
  policyname LIKE '%anonymous%' OR
  policyname LIKE '%temporary%'
)
ORDER BY tablename, policyname;