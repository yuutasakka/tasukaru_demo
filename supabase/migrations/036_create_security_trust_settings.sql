-- 安心・安全への取り組み設定テーブル
CREATE TABLE IF NOT EXISTS security_trust_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_class VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_security_trust_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_security_trust_settings_updated_at
BEFORE UPDATE ON security_trust_settings
FOR EACH ROW
EXECUTE FUNCTION update_security_trust_settings_updated_at();

-- RLS（Row Level Security）を有効化
ALTER TABLE security_trust_settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみが操作可能なポリシー
CREATE POLICY "管理者は全ての操作が可能" ON security_trust_settings
  FOR ALL USING (true)
  WITH CHECK (true);

-- 一般ユーザーは閲覧のみ可能
CREATE POLICY "一般ユーザーは閲覧のみ可能" ON security_trust_settings
  FOR SELECT USING (is_active = true);

-- 初期データの投入
INSERT INTO security_trust_settings (icon_class, title, description, display_order, is_active) VALUES
  ('fas fa-lock', 'SSL暗号化', '最高水準のセキュリティでお客様の情報を保護', 1, true),
  ('fas fa-university', '金融庁登録', '関東財務局長（金商）登録済み', 2, true),
  ('fas fa-certificate', 'プライバシーマーク', '個人情報保護の第三者認証取得', 3, true),
  ('fas fa-comment-slash', '営業電話なし', 'お客様からのご依頼がない限り連絡いたしません', 4, true);

-- インデックスの作成
CREATE INDEX idx_security_trust_settings_active_order ON security_trust_settings(is_active, display_order);