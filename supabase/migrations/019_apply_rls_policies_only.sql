-- RLSポリシーのみ適用（テーブル作成後）
-- 2024年12月17日

-- 注意: 018_create_tables_step_by_step.sql を先に実行してください

-- ステップ1: 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Enable public read access" ON legal_links;
DROP POLICY IF EXISTS "Enable public read access" ON homepage_content_settings;
DROP POLICY IF EXISTS "Enable public read access" ON admin_settings;
DROP POLICY IF EXISTS "Enable public read access" ON financial_planners;
DROP POLICY IF EXISTS "Enable public read access" ON financial_products;
DROP POLICY IF EXISTS "Enable public read access" ON expert_contact_settings;
DROP POLICY IF EXISTS "Enable anonymous count access" ON diagnosis_sessions;

-- ステップ2: RLSを有効化
ALTER TABLE legal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_sessions ENABLE ROW LEVEL SECURITY;

-- ステップ3: パブリック読み取りポリシーを適用

-- legal_linksテーブル: アクティブなリンクのみ公開
CREATE POLICY "Enable public read access" ON legal_links
FOR SELECT
TO public
USING (is_active = true);

-- homepage_content_settingsテーブル: 全て公開
CREATE POLICY "Enable public read access" ON homepage_content_settings
FOR SELECT
TO public
USING (true);

-- admin_settingsテーブル: 全て公開
CREATE POLICY "Enable public read access" ON admin_settings
FOR SELECT
TO public
USING (true);

-- financial_plannersテーブル: アクティブなプランナーのみ公開
CREATE POLICY "Enable public read access" ON financial_planners
FOR SELECT
TO public
USING (is_active = true);

-- financial_productsテーブル: アクティブな商品のみ公開
CREATE POLICY "Enable public read access" ON financial_products
FOR SELECT
TO public
USING (is_active = true);

-- expert_contact_settingsテーブル: アクティブな設定のみ公開
CREATE POLICY "Enable public read access" ON expert_contact_settings
FOR SELECT
TO public
USING (is_active = true);

-- diagnosis_sessionsテーブル: 匿名ユーザーがカウント取得可能
CREATE POLICY "Enable anonymous count access" ON diagnosis_sessions
FOR SELECT
TO public
USING (true);

-- 確認用クエリ
SELECT 'RLS policies applied successfully' as status;