-- 診断履歴管理テーブル
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    diagnosis_answers JSONB NOT NULL,
    sms_verified BOOLEAN DEFAULT FALSE,
    verification_timestamp TIMESTAMPTZ,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 電話番号にインデックスを作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_phone ON diagnosis_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_verified ON diagnosis_sessions(sms_verified);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_created_at ON diagnosis_sessions(created_at);

-- RLS（Row Level Security）を有効化
ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが診断セッションを参照できるポリシー
CREATE POLICY "Users can view diagnosis sessions" ON diagnosis_sessions
    FOR SELECT USING (true);

-- 新しいセッションの作成を許可
CREATE POLICY "Users can create diagnosis sessions" ON diagnosis_sessions
    FOR INSERT WITH CHECK (true);

-- セッションの更新を許可（SMS認証完了時）
CREATE POLICY "Users can update diagnosis sessions" ON diagnosis_sessions
    FOR UPDATE USING (true);

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_diagnosis_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_diagnosis_sessions_updated_at
    BEFORE UPDATE ON diagnosis_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_diagnosis_sessions_updated_at(); 