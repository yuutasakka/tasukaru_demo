-- 📱 SMS認証テーブル作成とインデックス最適化（統合版）
-- テーブルが存在しない場合の完全セットアップ

-- Step 1: SMS認証テーブルの作成
CREATE TABLE IF NOT EXISTS sms_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  request_ip INET DEFAULT '0.0.0.0'::inet NOT NULL,
  user_agent TEXT
);

-- Step 2: RLS設定
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;

-- Step 3: サービスロール専用ポリシー
DROP POLICY IF EXISTS "Service role only" ON sms_verifications;
CREATE POLICY "Service role only" ON sms_verifications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 4: 基本インデックス
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone 
ON sms_verifications(phone_number);

CREATE INDEX IF NOT EXISTS idx_sms_verifications_created_at 
ON sms_verifications(created_at DESC);

-- Step 5: IP追跡用インデックス
CREATE INDEX IF NOT EXISTS idx_sms_verifications_request_ip 
ON sms_verifications(request_ip, created_at DESC);

-- Step 6: 最重要: OTP検証最適化用複合インデックス
CREATE INDEX IF NOT EXISTS idx_phone_verified_created 
ON sms_verifications(phone_number, is_verified, created_at DESC);

-- Step 7: 状態別フィルタリング用インデックス
CREATE INDEX IF NOT EXISTS idx_is_verified 
ON sms_verifications(is_verified);

-- Step 8: レート制限チェック用関数
CREATE OR REPLACE FUNCTION check_sms_rate_limit(phone text, ip_addr inet DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    phone_count INTEGER;
    ip_count INTEGER;
    global_count INTEGER;
    suspicious_count INTEGER;
    hour_ago TIMESTAMP;
    ten_minutes_ago TIMESTAMP;
BEGIN
    hour_ago := now() - interval '1 hour';
    ten_minutes_ago := now() - interval '10 minutes';
    
    -- 1. 電話番号単位の制限チェック（1時間に3回）
    SELECT COUNT(*) INTO phone_count
    FROM sms_verifications
    WHERE phone_number = phone
    AND created_at >= hour_ago;
    
    IF phone_count >= 3 THEN
        RETURN FALSE;
    END IF;
    
    -- 2. IPアドレス単位の制限チェック（IPが提供されている場合）
    IF ip_addr IS NOT NULL THEN
        -- 2-1. IP単位の制限（1時間に10回）
        SELECT COUNT(*) INTO ip_count
        FROM sms_verifications
        WHERE request_ip = ip_addr
        AND created_at >= hour_ago;
        
        IF ip_count >= 10 THEN
            RETURN FALSE;
        END IF;
        
        -- 2-2. グローバル制限（全体で1時間に100回）
        SELECT COUNT(*) INTO global_count
        FROM sms_verifications
        WHERE created_at >= hour_ago;
        
        IF global_count >= 100 THEN
            RETURN FALSE;
        END IF;
        
        -- 2-3. 不審なパターン検出（同一IPから複数の電話番号）
        SELECT COUNT(DISTINCT phone_number) INTO suspicious_count
        FROM sms_verifications
        WHERE request_ip = ip_addr
        AND created_at >= ten_minutes_ago;
        
        IF suspicious_count > 5 THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Step 9: OTP試行回数増加関数
CREATE OR REPLACE FUNCTION increment_attempts(phone TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_attempts INTEGER;
BEGIN
  UPDATE sms_verifications 
  SET attempts = attempts + 1
  WHERE phone_number = phone 
    AND is_verified = false
  RETURNING attempts INTO new_attempts;
  
  RETURN COALESCE(new_attempts, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 10: 期限切れOTPの自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_verifications 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Step 11: 権限設定
GRANT EXECUTE ON FUNCTION check_sms_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION increment_attempts TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_otps TO service_role;

-- Step 12: 確認クエリ
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sms_verifications'
ORDER BY ordinal_position;

-- Step 13: インデックス確認
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sms_verifications'
ORDER BY indexname;

-- 完了メッセージ
SELECT '📱 SMS認証テーブル作成完了' as status;
SELECT '📊 高速化インデックス設定完了' as index_status;
SELECT '🛡️ セキュリティポリシー適用完了' as security_status;