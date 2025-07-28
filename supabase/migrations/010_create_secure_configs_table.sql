-- セキュア設定テーブルの作成
CREATE TABLE IF NOT EXISTS secure_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セキュア設定のRLS（Row Level Security）
ALTER TABLE secure_configs ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Admin only access" ON secure_configs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_secure_configs_key ON secure_configs(config_key);

-- SMS認証テーブルの作成
CREATE TABLE IF NOT EXISTS sms_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- SMS認証のRLS
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;

-- サービスロールのみアクセス可能
CREATE POLICY "Service role only" ON sms_verifications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_expires ON sms_verifications(expires_at);

-- 期限切れOTPの自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_verifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- OTP試行回数を増加する関数
CREATE OR REPLACE FUNCTION increment_attempts(phone TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_attempts INTEGER;
BEGIN
  UPDATE sms_verifications 
  SET attempts = attempts + 1 
  WHERE phone_number = phone AND is_verified = false;
  
  SELECT attempts INTO new_attempts 
  FROM sms_verifications 
  WHERE phone_number = phone AND is_verified = false 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  RETURN COALESCE(new_attempts, 0);
END;
$$ LANGUAGE plpgsql;

-- レート制限チェック関数（1時間に3回まで）
CREATE OR REPLACE FUNCTION check_sms_rate_limit(phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM sms_verifications
  WHERE phone_number = phone 
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN recent_count < 3;
END;
$$ LANGUAGE plpgsql;

-- 定期実行のためのextension（管理者が手動で有効化する必要があります）
-- SELECT cron.schedule('cleanup-expired-otps', '*/15 * * * *', 'SELECT cleanup_expired_otps();');