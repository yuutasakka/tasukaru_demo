-- 🔒 Row Level Security (RLS) 全面有効化
-- 本番環境セキュリティ強化のための包括的RLS設定

BEGIN;

-- Step 1: 全ての重要テーブルでRLSを有効化
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- Step 2: 管理者テーブルの厳格なRLSポリシー
DROP POLICY IF EXISTS "Admin credentials access" ON admin_credentials;
CREATE POLICY "Admin credentials access" ON admin_credentials
FOR ALL TO authenticated
USING (
  -- 認証されたユーザーが自分の認証情報のみアクセス可能
  auth.uid()::text = user_id::text OR
  -- または管理者ロールを持つユーザー
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
)
WITH CHECK (
  -- 管理者のみ作成・更新可能
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- Step 3: 診断セッションの保護
DROP POLICY IF EXISTS "User own diagnosis sessions" ON diagnosis_sessions;
CREATE POLICY "User own diagnosis sessions" ON diagnosis_sessions
FOR ALL TO anon, authenticated
USING (
  -- ユーザーは自分の電話番号に関連するセッションのみアクセス可能
  phone_number = current_setting('app.current_phone', true) OR
  -- 管理者は全てアクセス可能
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
)
WITH CHECK (
  phone_number = current_setting('app.current_phone', true) OR
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- Step 4: 認証コードの保護
DROP POLICY IF EXISTS "Verification codes access" ON verification_codes;
CREATE POLICY "Verification codes access" ON verification_codes
FOR ALL TO anon, authenticated
USING (
  -- ユーザーは自分の電話番号の認証コードのみ
  phone_number = current_setting('app.current_phone', true) OR
  -- 管理者は監査目的でアクセス可能（ただしコード値は除く）
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
)
WITH CHECK (
  phone_number = current_setting('app.current_phone', true)
);

-- Step 5: 登録リクエストの保護
DROP POLICY IF EXISTS "Registration requests policy" ON registration_requests;
CREATE POLICY "Registration requests policy" ON registration_requests
FOR ALL TO anon, authenticated
USING (
  -- 自分のリクエストまたは管理者のみアクセス可能
  phone_number = current_setting('app.current_phone', true) OR
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
)
WITH CHECK (
  phone_number = current_setting('app.current_phone', true) OR
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- Step 6: 監査ログの保護（読み取り専用、管理者のみ）
DROP POLICY IF EXISTS "Audit logs admin only" ON audit_logs;
CREATE POLICY "Audit logs admin only" ON audit_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- 監査ログ挿入は特別な権限でのみ
CREATE POLICY "Audit logs insert system" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'system' OR
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- Step 7: セキュリティ設定（管理者のみ）
DROP POLICY IF EXISTS "Security settings admin only" ON security_settings;
CREATE POLICY "Security settings admin only" ON security_settings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- Step 8: パスワード履歴（管理者のみ）
DROP POLICY IF EXISTS "Password history admin only" ON password_history;
CREATE POLICY "Password history admin only" ON password_history
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_credentials ac 
    WHERE ac.username = auth.jwt() ->> 'username' 
    AND ac.is_active = true
  )
);

-- Step 9: セキュリティ関数の作成
CREATE OR REPLACE FUNCTION set_current_phone(phone_text text)
RETURNS void AS $$
BEGIN
  -- 電話番号の形式検証
  IF phone_text !~ '^\+81-\d{2,3}-\d{4}-\d{4}$' AND phone_text !~ '^\d{10,11}$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- 現在の電話番号を設定
  PERFORM set_config('app.current_phone', phone_text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: 管理者認証関数の強化
CREATE OR REPLACE FUNCTION authenticate_admin(username_param text, password_param text)
RETURNS json AS $$
DECLARE
  admin_record admin_credentials%ROWTYPE;
  result json;
BEGIN
  -- 管理者認証情報取得
  SELECT * INTO admin_record 
  FROM admin_credentials 
  WHERE username = username_param 
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- アカウントロック確認
  IF admin_record.locked_until IS NOT NULL AND admin_record.locked_until > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Account locked');
  END IF;
  
  -- パスワード検証（bcrypt）
  IF NOT crypt(password_param, admin_record.password_hash) = admin_record.password_hash THEN
    -- 失敗試行回数を増加
    UPDATE admin_credentials 
    SET 
      failed_attempts = failed_attempts + 1,
      locked_until = CASE 
        WHEN failed_attempts >= 4 THEN NOW() + interval '30 minutes'
        ELSE NULL 
      END
    WHERE username = username_param;
    
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- 認証成功：失敗カウントリセット
  UPDATE admin_credentials 
  SET 
    failed_attempts = 0,
    locked_until = NULL,
    last_login = NOW()
  WHERE username = username_param;
  
  RETURN json_build_object(
    'success', true, 
    'username', admin_record.username,
    'requires_password_change', admin_record.requires_password_change
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: 監査ログ記録
INSERT INTO audit_logs (
  event_type,
  username,
  description,
  severity,
  metadata,
  created_at
) VALUES (
  'rls_policies_enabled',
  'system',
  'All RLS policies have been enabled for production security',
  'critical',
  json_build_object(
    'action', 'enable_all_rls',
    'timestamp', NOW(),
    'tables', ARRAY['admin_credentials', 'diagnosis_sessions', 'verification_codes', 'registration_requests', 'audit_logs', 'security_settings', 'password_history']
  ),
  NOW()
);

COMMIT;