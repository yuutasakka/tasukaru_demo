-- legal_links テーブルの修正

-- 1. 既存のテーブルがある場合、display_orderカラムを追加
DO $$
BEGIN
  -- display_orderカラムが存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'legal_links' 
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE legal_links ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2. 既存のデータにdisplay_orderを設定
UPDATE legal_links 
SET display_order = CASE 
  WHEN link_type = 'privacy_policy' THEN 1
  WHEN link_type = 'terms_of_service' THEN 2
  WHEN link_type = 'specified_commercial_transactions' THEN 3
  WHEN link_type = 'company_info' THEN 4
  ELSE 5
END
WHERE display_order IS NULL OR display_order = 0;

-- 3. デフォルトデータの追加（存在しない場合のみ）
INSERT INTO legal_links (link_type, title, url, display_order, is_active) VALUES
  ('privacy_policy', 'プライバシーポリシー', '/privacy', 1, true),
  ('terms_of_service', '利用規約', '/terms', 2, true),
  ('specified_commercial_transactions', '特定商取引法', '/scta', 3, true),
  ('company_info', '会社概要', '/company', 4, true)
ON CONFLICT (link_type) DO UPDATE 
SET 
  title = EXCLUDED.title,
  url = EXCLUDED.url,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 4. インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_legal_links_display_order ON legal_links(display_order);

-- 完了メッセージ
SELECT 'legal_links テーブル修正完了' as status;