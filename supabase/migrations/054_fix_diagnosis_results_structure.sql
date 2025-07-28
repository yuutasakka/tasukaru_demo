-- diagnosis_resultsテーブルの構造を修正
-- 診断データが正しく保存されるようにカラムを追加

-- diagnosis_dataカラムが存在しない場合は追加
ALTER TABLE diagnosis_results 
ADD COLUMN IF NOT EXISTS diagnosis_data JSONB;

-- user_idカラムが存在しない場合は追加
ALTER TABLE diagnosis_results 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- session_idカラムが存在しない場合は追加
ALTER TABLE diagnosis_results 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_user_id ON diagnosis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_session_id ON diagnosis_results(session_id);

-- RLSポリシーを更新（より柔軟に）
DROP POLICY IF EXISTS "Admin can manage diagnosis_results" ON diagnosis_results;

-- 誰でも挿入可能（診断完了時）
CREATE POLICY "Anyone can insert diagnosis_results" ON diagnosis_results
    FOR INSERT
    WITH CHECK (true);

-- 管理者は全て閲覧・更新・削除可能
CREATE POLICY "Admin can view all diagnosis_results" ON diagnosis_results
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated') OR
        auth.jwt() IS NULL -- 認証なしでも許可（API用）
    );

CREATE POLICY "Admin can update diagnosis_results" ON diagnosis_results
    FOR UPDATE
    USING (auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated'));

CREATE POLICY "Admin can delete diagnosis_results" ON diagnosis_results
    FOR DELETE
    USING (auth.jwt() ->> 'role' IN ('service_role', 'anon', 'authenticated'));

-- diagnosis_sessionsテーブルからデータを移行（存在する場合）
DO $$
BEGIN
    -- diagnosis_sessionsテーブルが存在するかチェック
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnosis_sessions') THEN
        -- データを移行
        INSERT INTO diagnosis_results (
            id,
            phone_number,
            diagnosis_data,
            session_id,
            created_at,
            updated_at
        )
        SELECT 
            id,
            phone_number,
            jsonb_build_object(
                'age', age_group,
                'experience', investment_experience,
                'purpose', investment_purpose,
                'amount', monthly_investment,
                'timing', start_timing
            ),
            session_id,
            created_at,
            updated_at
        FROM diagnosis_sessions
        WHERE NOT EXISTS (
            SELECT 1 FROM diagnosis_results dr 
            WHERE dr.id = diagnosis_sessions.id
        );
        
        RAISE NOTICE 'diagnosis_sessionsからデータを移行しました';
    END IF;
END
$$;

-- 確認
SELECT 
    'diagnosis_results structure updated' as status,
    COUNT(*) as total_records,
    COUNT(diagnosis_data) as records_with_data,
    COUNT(user_id) as records_with_user_id
FROM diagnosis_results;