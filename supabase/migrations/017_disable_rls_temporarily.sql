-- 緊急対応: RLSを一時的に無効化してサイトを動作させる
-- 注意: セキュリティ上のリスクがあるため、本番環境では使用しないでください

-- RLSを無効化
ALTER TABLE legal_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_planners DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE expert_contact_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_sessions DISABLE ROW LEVEL SECURITY;

SELECT 'RLS temporarily disabled for emergency access' as status;