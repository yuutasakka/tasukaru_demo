-- レート制限監視用のビューとインデックス

-- 1. リアルタイムレート制限状況ビュー
CREATE OR REPLACE VIEW rate_limit_status AS
WITH time_windows AS (
  SELECT 
    NOW() - INTERVAL '1 hour' AS hour_ago,
    NOW() - INTERVAL '10 minutes' AS ten_min_ago,
    NOW() - INTERVAL '5 minutes' AS five_min_ago
)
SELECT 
  'phone' AS limit_type,
  phone_number AS identifier,
  COUNT(*) AS request_count,
  3 AS limit_threshold,
  GREATEST(0, 3 - COUNT(*)) AS remaining_quota,
  CASE WHEN COUNT(*) >= 3 THEN TRUE ELSE FALSE END AS is_blocked,
  MIN(created_at) AS window_start,
  MAX(created_at) AS last_request,
  ARRAY_AGG(DISTINCT request_ip) AS associated_ips
FROM sms_verifications, time_windows
WHERE created_at >= hour_ago
GROUP BY phone_number

UNION ALL

SELECT 
  'ip' AS limit_type,
  request_ip AS identifier,
  COUNT(*) AS request_count,
  10 AS limit_threshold,
  GREATEST(0, 10 - COUNT(*)) AS remaining_quota,
  CASE WHEN COUNT(*) >= 10 THEN TRUE ELSE FALSE END AS is_blocked,
  MIN(created_at) AS window_start,
  MAX(created_at) AS last_request,
  ARRAY_AGG(DISTINCT phone_number) AS associated_phones
FROM sms_verifications, time_windows
WHERE created_at >= hour_ago
GROUP BY request_ip;

-- 2. OTP有効期限監視ビュー
CREATE OR REPLACE VIEW otp_ttl_status AS
SELECT 
  phone_number,
  verification_code,
  created_at,
  created_at + INTERVAL '5 minutes' AS expires_at,
  EXTRACT(EPOCH FROM (created_at + INTERVAL '5 minutes' - NOW()))::INT AS ttl_seconds,
  is_verified,
  attempts,
  CASE 
    WHEN is_verified THEN 'USED'
    WHEN NOW() > created_at + INTERVAL '5 minutes' THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END AS status
FROM sms_verifications
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 3. 異常検知ビュー
CREATE OR REPLACE VIEW anomaly_detection AS
WITH ip_stats AS (
  SELECT 
    request_ip,
    COUNT(*) AS request_count,
    COUNT(DISTINCT phone_number) AS unique_phones,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen
  FROM sms_verifications
  WHERE created_at >= NOW() - INTERVAL '1 hour'
  GROUP BY request_ip
),
phone_stats AS (
  SELECT 
    phone_number,
    COUNT(*) AS request_count,
    COUNT(DISTINCT request_ip) AS unique_ips,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen
  FROM sms_verifications
  WHERE created_at >= NOW() - INTERVAL '1 hour'
  GROUP BY phone_number
)
SELECT 
  'HIGH_VOLUME_IP' AS anomaly_type,
  request_ip AS identifier,
  request_count,
  unique_phones AS related_count,
  CASE 
    WHEN request_count >= 50 THEN 'CRITICAL'
    WHEN request_count >= 20 THEN 'HIGH'
    ELSE 'MEDIUM'
  END AS severity,
  first_seen,
  last_seen
FROM ip_stats
WHERE request_count >= 15

UNION ALL

SELECT 
  'FREQUENT_PHONE_REQUESTS' AS anomaly_type,
  phone_number AS identifier,
  request_count,
  unique_ips AS related_count,
  CASE 
    WHEN request_count >= 20 THEN 'CRITICAL'
    WHEN request_count >= 10 THEN 'HIGH'
    ELSE 'MEDIUM'
  END AS severity,
  first_seen,
  last_seen
FROM phone_stats
WHERE request_count >= 8

UNION ALL

SELECT 
  'IP_HOPPING' AS anomaly_type,
  phone_number AS identifier,
  request_count,
  unique_ips AS related_count,
  'HIGH' AS severity,
  first_seen,
  last_seen
FROM phone_stats
WHERE unique_ips >= 3;

-- 4. 統計サマリービュー
CREATE OR REPLACE VIEW rate_limit_statistics AS
SELECT 
  COUNT(*) AS total_requests,
  COUNT(DISTINCT phone_number) AS unique_phones,
  COUNT(DISTINCT request_ip) AS unique_ips,
  COUNT(CASE WHEN is_verified THEN 1 END) AS successful_verifications,
  ROUND(
    COUNT(CASE WHEN is_verified THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) AS success_rate,
  COUNT(CASE WHEN NOT is_verified AND NOW() > created_at + INTERVAL '5 minutes' THEN 1 END) AS expired_otps,
  MIN(created_at) AS period_start,
  MAX(created_at) AS period_end
FROM sms_verifications
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 5. ホワイトリスト管理テーブル
CREATE TABLE IF NOT EXISTS rate_limit_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('phone', 'ip', 'fingerprint')),
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(identifier, identifier_type)
);

-- ホワイトリスト状況ビュー
CREATE OR REPLACE VIEW whitelist_status AS
SELECT 
  identifier,
  identifier_type,
  reason,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'PERMANENT'
    WHEN expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END AS status,
  created_by,
  created_at
FROM rate_limit_whitelist
WHERE is_active = TRUE
ORDER BY created_at DESC;

-- 6. 監視用インデックス
CREATE INDEX IF NOT EXISTS idx_sms_verifications_monitoring 
ON sms_verifications(created_at DESC, request_ip, phone_number)
WHERE created_at >= NOW() - INTERVAL '24 hours';

CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone_recent 
ON sms_verifications(phone_number, created_at DESC)
WHERE created_at >= NOW() - INTERVAL '1 hour';

CREATE INDEX IF NOT EXISTS idx_sms_verifications_ip_recent 
ON sms_verifications(request_ip, created_at DESC)
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 7. 自動クリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sms_verifications
  WHERE created_at < NOW() - INTERVAL '24 hours'
  AND is_verified = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- ログ記録
  INSERT INTO security_events (
    event_type,
    event_details,
    severity,
    created_at
  ) VALUES (
    'OTP_CLEANUP',
    jsonb_build_object('deleted_count', deleted_count),
    'info',
    NOW()
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 定期実行用のスケジュール（pg_cronが必要）
-- SELECT cron.schedule('cleanup-expired-otps', '0 * * * *', 'SELECT cleanup_expired_otps();');

-- 8. レート制限チェック関数（Atomic実装）
CREATE OR REPLACE FUNCTION check_rate_limit_atomic(
  p_identifier VARCHAR(255),
  p_type VARCHAR(50),
  p_limit INTEGER
) RETURNS TABLE(
  allowed BOOLEAN,
  current_count INTEGER,
  remaining_quota INTEGER
) AS $$
DECLARE
  v_count INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- トランザクション内でアトミックにカウントと判定
  LOCK TABLE sms_verifications IN SHARE ROW EXCLUSIVE MODE;
  
  IF p_type = 'phone' THEN
    SELECT COUNT(*) INTO v_count
    FROM sms_verifications
    WHERE phone_number = p_identifier
    AND created_at >= NOW() - INTERVAL '1 hour';
  ELSIF p_type = 'ip' THEN
    SELECT COUNT(*) INTO v_count
    FROM sms_verifications
    WHERE request_ip = p_identifier
    AND created_at >= NOW() - INTERVAL '1 hour';
  ELSE
    v_count := 0;
  END IF;
  
  v_allowed := v_count < p_limit;
  
  RETURN QUERY
  SELECT 
    v_allowed,
    v_count,
    GREATEST(0, p_limit - v_count);
END;
$$ LANGUAGE plpgsql;

-- 9. 監査ログ検索関数
CREATE OR REPLACE FUNCTION search_audit_logs(
  p_event_type VARCHAR(255) DEFAULT NULL,
  p_severity VARCHAR(50) DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP DEFAULT NOW(),
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE(
  event_id UUID,
  event_type VARCHAR(255),
  severity VARCHAR(50),
  event_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id AS event_id,
    security_events.event_type,
    security_events.severity,
    security_events.event_details,
    security_events.created_at
  FROM security_events
  WHERE 
    (p_event_type IS NULL OR security_events.event_type = p_event_type)
    AND (p_severity IS NULL OR security_events.severity = p_severity)
    AND security_events.created_at BETWEEN p_start_date AND p_end_date
  ORDER BY security_events.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- アクセス権限の設定
GRANT SELECT ON rate_limit_status TO authenticated;
GRANT SELECT ON otp_ttl_status TO authenticated;
GRANT SELECT ON anomaly_detection TO authenticated;
GRANT SELECT ON rate_limit_statistics TO authenticated;
GRANT SELECT ON whitelist_status TO authenticated;