-- 🔒 強化されたセキュリティ機能の実装
-- IP変更攻撃、電話番号回転、デバイスフィンガープリント等への対策

-- =====================================================
-- 1. デバイスフィンガープリントテーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint_hash VARCHAR(64) NOT NULL UNIQUE,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(100),
    language VARCHAR(10),
    platform VARCHAR(50),
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    touch_support BOOLEAN,
    webgl_renderer TEXT,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trust_score INTEGER DEFAULT 50,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_device_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fingerprints_trust_score ON device_fingerprints(trust_score);
CREATE INDEX idx_device_fingerprints_blocked ON device_fingerprints(is_blocked) WHERE is_blocked = TRUE;

-- =====================================================
-- 2. IP評価テーブル（VPN/プロキシ検出）
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_reputation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    is_vpn BOOLEAN DEFAULT FALSE,
    is_proxy BOOLEAN DEFAULT FALSE,
    is_datacenter BOOLEAN DEFAULT FALSE,
    is_tor BOOLEAN DEFAULT FALSE,
    asn INTEGER,
    asn_org TEXT,
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    risk_score INTEGER DEFAULT 0,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_ip_reputation_address ON ip_reputation(ip_address);
CREATE INDEX idx_ip_reputation_risk ON ip_reputation(risk_score);

-- =====================================================
-- 3. 電話番号評価テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS phone_reputation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    is_virtual BOOLEAN DEFAULT FALSE,
    is_burner BOOLEAN DEFAULT FALSE,
    carrier VARCHAR(100),
    line_type VARCHAR(50), -- mobile, landline, voip
    country_code VARCHAR(2),
    risk_score INTEGER DEFAULT 0,
    verification_count INTEGER DEFAULT 0,
    first_verification TIMESTAMP WITH TIME ZONE,
    last_verification TIMESTAMP WITH TIME ZONE,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_phone_reputation_number ON phone_reputation(phone_number);
CREATE INDEX idx_phone_reputation_risk ON phone_reputation(risk_score);
CREATE INDEX idx_phone_reputation_blocked ON phone_reputation(is_blocked) WHERE is_blocked = TRUE;

-- =====================================================
-- 4. 認証試行ログテーブル（行動分析用）
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    ip_address INET NOT NULL,
    fingerprint_hash VARCHAR(64),
    session_id VARCHAR(64),
    attempt_type VARCHAR(20) NOT NULL, -- send_otp, verify_otp
    status VARCHAR(20) NOT NULL, -- success, failed, blocked
    risk_score INTEGER DEFAULT 0,
    risk_flags TEXT[], -- 配列でリスクフラグを保存
    user_agent TEXT,
    referrer TEXT,
    geo_country VARCHAR(2),
    geo_region VARCHAR(100),
    geo_city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_auth_attempts_phone ON auth_attempts(phone_number, created_at DESC);
CREATE INDEX idx_auth_attempts_ip ON auth_attempts(ip_address, created_at DESC);
CREATE INDEX idx_auth_attempts_fingerprint ON auth_attempts(fingerprint_hash, created_at DESC);
CREATE INDEX idx_auth_attempts_session ON auth_attempts(session_id, created_at DESC);
CREATE INDEX idx_auth_attempts_created ON auth_attempts(created_at DESC);

-- =====================================================
-- 5. レート制限バケットテーブル（トークンバケット実装）
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_key VARCHAR(255) NOT NULL UNIQUE, -- 例: phone:+81901234567, ip:192.168.1.1
    bucket_type VARCHAR(50) NOT NULL, -- phone, ip, fingerprint, global
    tokens DECIMAL(10,2) NOT NULL,
    capacity INTEGER NOT NULL,
    refill_rate DECIMAL(10,2) NOT NULL, -- tokens per second
    last_refill TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_rate_limit_buckets_key ON rate_limit_buckets(bucket_key);
CREATE INDEX idx_rate_limit_buckets_type ON rate_limit_buckets(bucket_type);
CREATE INDEX idx_rate_limit_buckets_expires ON rate_limit_buckets(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 6. セキュリティイベントテーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- rate_limit_exceeded, suspicious_pattern, blocked_access
    severity VARCHAR(20) NOT NULL, -- info, warning, critical
    entity_type VARCHAR(50), -- phone, ip, fingerprint
    entity_value TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at DESC);

-- =====================================================
-- 7. 既存テーブルの拡張
-- =====================================================

-- sms_verificationsテーブルに新しいカラムを追加
ALTER TABLE sms_verifications 
ADD COLUMN IF NOT EXISTS fingerprint_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS session_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_flags TEXT[],
ADD COLUMN IF NOT EXISTS required_captcha BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS captcha_verified BOOLEAN DEFAULT FALSE;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_sms_verifications_fingerprint 
ON sms_verifications(fingerprint_hash) WHERE fingerprint_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_verifications_session 
ON sms_verifications(session_id) WHERE session_id IS NOT NULL;

-- =====================================================
-- 8. 強化されたレート制限関数
-- =====================================================
CREATE OR REPLACE FUNCTION check_enhanced_rate_limit(
    p_phone VARCHAR,
    p_ip INET,
    p_fingerprint VARCHAR DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_risk_score INTEGER := 0;
    v_risk_flags TEXT[] := '{}';
    v_allowed BOOLEAN := TRUE;
    v_require_captcha BOOLEAN := FALSE;
    
    -- カウンター変数
    v_phone_count INTEGER;
    v_ip_count INTEGER;
    v_fingerprint_count INTEGER;
    v_unique_phones_per_ip INTEGER;
    v_unique_ips_per_phone INTEGER;
    
    -- 時間窓
    v_1_hour_ago TIMESTAMP := NOW() - INTERVAL '1 hour';
    v_10_min_ago TIMESTAMP := NOW() - INTERVAL '10 minutes';
    v_24_hours_ago TIMESTAMP := NOW() - INTERVAL '24 hours';
BEGIN
    -- 1. 電話番号ベースのチェック（1時間に3回）
    SELECT COUNT(*) INTO v_phone_count
    FROM sms_verifications
    WHERE phone_number = p_phone
    AND created_at >= v_1_hour_ago;
    
    IF v_phone_count >= 3 THEN
        v_risk_score := v_risk_score + 50;
        v_risk_flags := array_append(v_risk_flags, 'PHONE_RATE_LIMIT');
        v_allowed := FALSE;
    END IF;
    
    -- 2. IPアドレスベースのチェック（1時間に10回）
    SELECT COUNT(*) INTO v_ip_count
    FROM sms_verifications
    WHERE request_ip = p_ip
    AND created_at >= v_1_hour_ago;
    
    IF v_ip_count >= 10 THEN
        v_risk_score := v_risk_score + 40;
        v_risk_flags := array_append(v_risk_flags, 'IP_RATE_LIMIT');
        v_allowed := FALSE;
    END IF;
    
    -- 3. 同一IPから複数電話番号への送信（10分で5個以上）
    SELECT COUNT(DISTINCT phone_number) INTO v_unique_phones_per_ip
    FROM sms_verifications
    WHERE request_ip = p_ip
    AND created_at >= v_10_min_ago;
    
    IF v_unique_phones_per_ip > 5 THEN
        v_risk_score := v_risk_score + 60;
        v_risk_flags := array_append(v_risk_flags, 'PHONE_ENUMERATION');
        v_allowed := FALSE;
    END IF;
    
    -- 4. 同一電話番号に対する複数IPからのアクセス（1時間で3個以上）
    SELECT COUNT(DISTINCT request_ip) INTO v_unique_ips_per_phone
    FROM sms_verifications
    WHERE phone_number = p_phone
    AND created_at >= v_1_hour_ago;
    
    IF v_unique_ips_per_phone > 3 THEN
        v_risk_score := v_risk_score + 30;
        v_risk_flags := array_append(v_risk_flags, 'IP_HOPPING');
        v_require_captcha := TRUE;
    END IF;
    
    -- 5. フィンガープリントベースのチェック（指定された場合）
    IF p_fingerprint IS NOT NULL THEN
        SELECT COUNT(*) INTO v_fingerprint_count
        FROM sms_verifications
        WHERE fingerprint_hash = p_fingerprint
        AND created_at >= v_1_hour_ago;
        
        IF v_fingerprint_count >= 15 THEN
            v_risk_score := v_risk_score + 35;
            v_risk_flags := array_append(v_risk_flags, 'DEVICE_RATE_LIMIT');
            v_require_captcha := TRUE;
        END IF;
    END IF;
    
    -- 6. IP評価チェック
    IF EXISTS (
        SELECT 1 FROM ip_reputation
        WHERE ip_address = p_ip
        AND (is_vpn = TRUE OR is_proxy = TRUE OR is_tor = TRUE)
    ) THEN
        v_risk_score := v_risk_score + 40;
        v_risk_flags := array_append(v_risk_flags, 'SUSPICIOUS_IP');
        v_require_captcha := TRUE;
    END IF;
    
    -- 7. 電話番号評価チェック
    IF EXISTS (
        SELECT 1 FROM phone_reputation
        WHERE phone_number = p_phone
        AND (is_virtual = TRUE OR is_burner = TRUE OR is_blocked = TRUE)
    ) THEN
        v_risk_score := v_risk_score + 50;
        v_risk_flags := array_append(v_risk_flags, 'SUSPICIOUS_PHONE');
        v_allowed := FALSE;
    END IF;
    
    -- リスクスコアに基づく最終判定
    IF v_risk_score >= 100 THEN
        v_allowed := FALSE;
    ELSIF v_risk_score >= 50 THEN
        v_require_captcha := TRUE;
    END IF;
    
    -- 結果を構築
    v_result := jsonb_build_object(
        'allowed', v_allowed,
        'risk_score', LEAST(v_risk_score, 100),
        'risk_flags', v_risk_flags,
        'require_captcha', v_require_captcha,
        'phone_count', v_phone_count,
        'ip_count', v_ip_count,
        'unique_phones_per_ip', v_unique_phones_per_ip,
        'unique_ips_per_phone', v_unique_ips_per_phone
    );
    
    -- 認証試行をログに記録
    INSERT INTO auth_attempts (
        phone_number, ip_address, fingerprint_hash, session_id,
        attempt_type, status, risk_score, risk_flags
    ) VALUES (
        p_phone, p_ip, p_fingerprint, p_session_id,
        'send_otp', 
        CASE WHEN v_allowed THEN 'success' ELSE 'blocked' END,
        v_risk_score, v_risk_flags
    );
    
    -- セキュリティイベントを記録（高リスクの場合）
    IF v_risk_score >= 70 OR NOT v_allowed THEN
        INSERT INTO security_events (
            event_type, severity, entity_type, entity_value,
            description, metadata
        ) VALUES (
            CASE WHEN NOT v_allowed THEN 'blocked_access' ELSE 'suspicious_pattern' END,
            CASE WHEN v_risk_score >= 80 THEN 'critical' ELSE 'warning' END,
            'multi', p_phone || '|' || p_ip::TEXT,
            'High risk authentication attempt detected',
            v_result
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- 9. トークンバケット関数
-- =====================================================
CREATE OR REPLACE FUNCTION consume_rate_limit_token(
    p_bucket_key VARCHAR,
    p_bucket_type VARCHAR,
    p_capacity INTEGER,
    p_refill_rate DECIMAL,
    p_tokens_requested INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_tokens DECIMAL;
    v_last_refill TIMESTAMP;
    v_time_passed DECIMAL;
    v_new_tokens DECIMAL;
BEGIN
    -- 既存のバケットを取得または作成
    INSERT INTO rate_limit_buckets (
        bucket_key, bucket_type, tokens, capacity, refill_rate
    ) VALUES (
        p_bucket_key, p_bucket_type, p_capacity, p_capacity, p_refill_rate
    )
    ON CONFLICT (bucket_key) DO NOTHING;
    
    -- トークンを更新して消費を試みる
    WITH updated AS (
        UPDATE rate_limit_buckets
        SET 
            tokens = LEAST(
                capacity,
                tokens + (EXTRACT(EPOCH FROM NOW() - last_refill) * refill_rate)
            ) - p_tokens_requested,
            last_refill = NOW()
        WHERE bucket_key = p_bucket_key
        AND tokens + (EXTRACT(EPOCH FROM NOW() - last_refill) * refill_rate) >= p_tokens_requested
        RETURNING tokens
    )
    SELECT COUNT(*) > 0 FROM updated INTO v_new_tokens;
    
    RETURN v_new_tokens;
END;
$$;

-- =====================================================
-- 10. 定期クリーンアップ関数
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_security_data()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- 30日以上前の認証試行を削除
    DELETE FROM auth_attempts WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- 90日以上前のセキュリティイベントを削除
    DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- 期限切れのレート制限バケットを削除
    DELETE FROM rate_limit_buckets WHERE expires_at < NOW();
    
    -- 1年以上更新されていないIP評価を削除
    DELETE FROM ip_reputation WHERE last_checked < NOW() - INTERVAL '1 year';
END;
$$;

-- =====================================================
-- 11. 権限設定
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- anon ロールには読み取りのみ許可
GRANT SELECT ON device_fingerprints TO anon;
GRANT SELECT ON security_events TO anon;

-- =====================================================
-- 12. 初期データ投入（既知の悪質IP等）
-- =====================================================
-- 例: 既知のVPNプロバイダーのIPレンジ
INSERT INTO ip_reputation (ip_address, is_vpn, risk_score) VALUES
    ('10.0.0.0', TRUE, 50),
    ('172.16.0.0', TRUE, 50),
    ('192.168.0.0', TRUE, 50)
ON CONFLICT (ip_address) DO NOTHING;

-- =====================================================
-- 13. 確認クエリ
-- =====================================================
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'device_fingerprints', 'ip_reputation', 'phone_reputation',
    'auth_attempts', 'rate_limit_buckets', 'security_events'
)
GROUP BY table_name
ORDER BY table_name;

-- 完了メッセージ
SELECT '🔒 強化されたセキュリティ機能の実装完了' as status;
SELECT '✅ IP変更攻撃、電話番号回転、デバイスフィンガープリント対策が有効化されました' as message;