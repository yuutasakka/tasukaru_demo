-- 📊 SMS認証テーブルインデックス最適化
-- OTP検証クエリの高速化とパフォーマンス改善

-- Step 1: 現在のクエリパターン分析結果
-- 主要クエリ: WHERE phone_number = ? AND is_verified = false ORDER BY created_at DESC

-- Step 2: 最重要インデックス - phone_number + is_verified + created_at 複合
-- このインデックスで OTP検証クエリが O(log n) で高速実行される
CREATE INDEX IF NOT EXISTS idx_phone_verified_created 
ON sms_verifications(phone_number, is_verified, created_at DESC);

-- Step 3: is_verified 状態別クエリ最適化
-- 認証済み/未認証のフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_is_verified 
ON sms_verifications(is_verified);

-- Step 4: クリーンアップ用インデックス（期限切れデータ削除の高速化）
-- created_at のみのクエリは既存インデックスでカバー済み

-- Step 5: 既存インデックスの確認とパフォーマンステスト用クエリ
-- 現在設定されているインデックス一覧を確認
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sms_verifications'
ORDER BY indexname;

-- Step 6: 主要クエリのパフォーマンステスト
-- 本クエリのEXPLAIN PLAN を確認して最適化を検証
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT otp_code, created_at, attempts 
-- FROM sms_verifications 
-- WHERE phone_number = '+819057044893' 
--   AND is_verified = false 
-- ORDER BY created_at DESC 
-- LIMIT 1;

-- Step 7: インデックスサイズとメンテナンス情報
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE tablename = 'sms_verifications'
AND attname IN ('phone_number', 'is_verified', 'created_at')
ORDER BY attname;

-- Step 8: 重複インデックスの確認
-- 同じカラムセットの重複インデックスがないかチェック
WITH index_columns AS (
    SELECT 
        i.schemaname,
        i.tablename,
        i.indexname,
        array_agg(a.attname ORDER BY a.attnum) as columns
    FROM pg_indexes i
    JOIN pg_class c ON c.relname = i.indexname
    JOIN pg_index idx ON idx.indexrelid = c.oid
    JOIN pg_attribute a ON a.attrelid = idx.indrelid 
        AND a.attnum = ANY(idx.indkey)
    WHERE i.tablename = 'sms_verifications'
    GROUP BY i.schemaname, i.tablename, i.indexname
)
SELECT 
    indexname,
    columns,
    CASE 
        WHEN COUNT(*) OVER (PARTITION BY columns) > 1 
        THEN '⚠️ 重複の可能性'
        ELSE '✅ 正常'
    END as status
FROM index_columns
ORDER BY columns, indexname;

-- Step 9: レート制限クエリの最適化確認
-- IP + created_at インデックスが適切に使用されているか確認
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT COUNT(*) 
-- FROM sms_verifications 
-- WHERE request_ip = '192.168.1.1'::inet 
--   AND created_at >= (now() - interval '1 hour');

-- Step 10: メモリ使用量の最適化
-- インデックスがメモリに適切にキャッシュされているか確認
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as table_size
FROM pg_indexes 
WHERE tablename = 'sms_verifications'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- 完了メッセージ
SELECT '📊 SMS認証インデックス最適化完了' as status;
SELECT '⚡ OTP検証クエリの高速化が実装されました' as performance_status;
SELECT 'phone_number + is_verified + created_at 複合インデックスで O(log n) 検索を実現' as technical_details;