-- 📱 SMS認証テーブルへのIPアドレス追跡機能追加
-- レート制限とセキュリティ監査のためのIPアドレス追跡

-- Step 1: sms_verifications テーブルにIPアドレス列を追加
ALTER TABLE sms_verifications 
ADD COLUMN IF NOT EXISTS request_ip INET;

-- Step 2: User-Agent文字列も追加（デバイス識別用）
ALTER TABLE sms_verifications 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Step 3: 作成日時のインデックスを追加（レート制限検索の高速化）
CREATE INDEX IF NOT EXISTS idx_sms_verifications_created_at 
ON sms_verifications (created_at DESC);

-- Step 4: IPアドレスのインデックスを追加（IP制限検索の高速化）
CREATE INDEX IF NOT EXISTS idx_sms_verifications_request_ip 
ON sms_verifications (request_ip, created_at DESC);

-- Step 5: 電話番号 + 作成日時のインデックスを追加（電話番号制限検索の高速化）
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone_created 
ON sms_verifications (phone_number, created_at DESC);

-- Step 6: レート制限チェック用のPostgreSQL関数を更新
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

-- Step 7: 古いレート制限関数を削除（引数が異なる）
DROP FUNCTION IF EXISTS check_sms_rate_limit(text);

-- Step 8: 監査用のビューを作成
CREATE OR REPLACE VIEW sms_audit_view AS
SELECT 
    phone_number,
    request_ip,
    user_agent,
    created_at,
    expires_at,
    attempts,
    is_verified,
    verified_at,
    CASE 
        WHEN attempts >= 5 THEN '🚫 ブロック済み'
        WHEN is_verified THEN '✅ 認証済み'
        WHEN expires_at < now() THEN '⏰ 期限切れ'
        ELSE '⏳ 待機中'
    END as status
FROM sms_verifications
ORDER BY created_at DESC;

-- Step 9: 不審なIPアドレスを検出するビュー
CREATE OR REPLACE VIEW suspicious_ip_view AS
SELECT 
    request_ip,
    COUNT(*) as attempt_count,
    COUNT(DISTINCT phone_number) as unique_phones,
    MIN(created_at) as first_attempt,
    MAX(created_at) as last_attempt,
    CASE 
        WHEN COUNT(DISTINCT phone_number) > 5 THEN '🚨 複数番号攻撃'
        WHEN COUNT(*) > 10 THEN '🚨 高頻度攻撃'
        ELSE '⚠️ 要監視'
    END as threat_level
FROM sms_verifications
WHERE created_at >= (now() - interval '1 hour')
AND request_ip IS NOT NULL
GROUP BY request_ip
HAVING COUNT(*) > 3 OR COUNT(DISTINCT phone_number) > 2
ORDER BY attempt_count DESC, unique_phones DESC;

-- Step 10: 権限設定
-- service_role のみがこれらの関数とビューにアクセス可能
GRANT EXECUTE ON FUNCTION check_sms_rate_limit TO service_role;
GRANT SELECT ON sms_audit_view TO service_role;
GRANT SELECT ON suspicious_ip_view TO service_role;

-- Step 11: 既存データの後方互換性（IPアドレスがNULLの場合のデフォルト値）
UPDATE sms_verifications 
SET request_ip = '0.0.0.0'::inet
WHERE request_ip IS NULL;

-- Step 12: 今後のデータ整合性のため、NOT NULL制約を追加
ALTER TABLE sms_verifications 
ALTER COLUMN request_ip SET NOT NULL;

-- Step 13: IPアドレスのデフォルト値を設定
ALTER TABLE sms_verifications 
ALTER COLUMN request_ip SET DEFAULT '0.0.0.0'::inet;

-- Step 14: 確認クエリ
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sms_verifications'
AND column_name IN ('request_ip', 'user_agent')
ORDER BY column_name;

-- Step 15: インデックスの確認
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sms_verifications'
AND indexname LIKE 'idx_sms_verifications_%'
ORDER BY indexname;

-- 完了メッセージ
SELECT '📱 SMS認証IP追跡機能追加完了' as status;
SELECT '🛡️ レート制限とセキュリティ監査機能が強化されました' as security_status;