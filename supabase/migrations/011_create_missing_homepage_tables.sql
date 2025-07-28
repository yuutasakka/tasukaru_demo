-- 不足しているテーブル作成 - マイグレーション 011
-- 400エラーを解決するため必要なテーブルをすべて作成

-- 1. update_modified_time関数（既存の場合は無視）
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. homepage_content_settingsテーブル作成
CREATE TABLE IF NOT EXISTS homepage_content_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_data JSONB,
    title VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. admin_settingsテーブル作成
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    title VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_homepage_content_key ON homepage_content_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_homepage_content_active ON homepage_content_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_active ON admin_settings(is_active);

-- 5. Row Level Security (RLS) の有効化
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシー作成（読み取りは誰でも可能、書き込みは認証済みユーザーのみ）
DROP POLICY IF EXISTS "homepage_content_read_policy" ON homepage_content_settings;
CREATE POLICY "homepage_content_read_policy" ON homepage_content_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "homepage_content_write_policy" ON homepage_content_settings;
CREATE POLICY "homepage_content_write_policy" ON homepage_content_settings
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_settings_read_policy" ON admin_settings;
CREATE POLICY "admin_settings_read_policy" ON admin_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_settings_write_policy" ON admin_settings;
CREATE POLICY "admin_settings_write_policy" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 7. 初期データの挿入（homepage_content_settings）
INSERT INTO homepage_content_settings (
    setting_key,
    setting_data,
    title,
    description,
    display_order
) VALUES 
(
    'first_consultation_offer',
    '{
        "title": "初回相談無料キャンペーン",
        "description": "資産運用のプロが、あなたの状況に合わせて最適なプランをご提案します。",
        "price": "通常5,000円 → 今なら無料",
        "features": [
            "現在の資産状況の詳細分析",
            "将来目標に向けた運用戦略の提案",
            "リスク許容度に応じた商品選択",
            "具体的な行動プランの作成"
        ],
        "buttonText": "今すぐ無料相談を予約",
        "validUntil": "2024-12-31"
    }'::jsonb,
    '初回相談無料オファー',
    'ファーストビューの特別オファー内容',
    1
),
(
    'footer_data',
    '{
        "companyName": "AI ConnectX",
        "description": "あなたの資産運用を全力でサポートします。",
        "contact": {
            "phone": "0120-123-456",
            "email": "info@moneyticket.com",
            "hours": "平日 9:00-18:00"
        },
        "links": [
            {"label": "プライバシーポリシー", "href": "/privacy"},
            {"label": "利用規約", "href": "/terms"},
            {"label": "特定商取引法", "href": "/tokusho"}
        ],
        "social": [
            {"platform": "Twitter", "url": "https://twitter.com/moneyticket"},
            {"platform": "Facebook", "url": "https://facebook.com/moneyticket"}
        ]
    }'::jsonb,
    'フッター設定',
    'サイトフッターの会社情報とリンク',
    2
),
(
    'reasons_to_choose',
    '{
        "title": "AI ConnectXが選ばれる理由",
        "subtitle": "安心・安全・確実な資産運用サポート",
        "reasons": [
            {
                "icon": "fa-chart-line",
                "title": "データ分析による最適化",
                "description": "過去の市場データと最新のAI技術を活用し、お客様に最適な投資戦略をご提案します。"
            },
            {
                "icon": "fa-shield-alt",
                "title": "安心のセキュリティ",
                "description": "お客様の大切な情報は、銀行レベルのセキュリティで厳重に保護されています。"
            },
            {
                "icon": "fa-user-tie",
                "title": "専門家のサポート",
                "description": "経験豊富なファイナンシャルプランナーが、お客様の資産運用を全力でサポートします。"
            }
        ]
    }'::jsonb,
    '選ばれる理由セクション',
    'サービスの特徴・強みを紹介するセクション',
    3
)
ON CONFLICT (setting_key) DO NOTHING;

-- 8. 初期データの挿入（admin_settings）
INSERT INTO admin_settings (
    setting_key,
    setting_value,
    title,
    description
) VALUES 
(
    'testimonials',
    '{
        "title": "お客様の声",
        "subtitle": "実際にご利用いただいたお客様からの声をご紹介します",
        "testimonials": [
            {
                "name": "田中様（30代・会社員）",
                "rating": 5,
                "comment": "初心者でしたが、丁寧な説明で安心して投資を始められました。",
                "investment_type": "つみたてNISA",
                "result": "6ヶ月で+8%の運用実績"
            },
            {
                "name": "佐藤様（40代・主婦）",
                "rating": 5,
                "comment": "家計に合わせた無理のないプランを提案していただけました。",
                "investment_type": "個人年金保険",
                "result": "月2万円の積立で将来安心"
            },
            {
                "name": "山田様（50代・自営業）",
                "rating": 4,
                "comment": "リスクを抑えつつ、着実に資産を増やせています。",
                "investment_type": "バランス型投資信託",
                "result": "1年で+12%の運用実績"
            }
        ]
    }'::jsonb,
    'お客様の声設定',
    'お客様の体験談とレビュー'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 9. 更新トリガーの設定
DROP TRIGGER IF EXISTS homepage_content_update_trigger ON homepage_content_settings;
CREATE TRIGGER homepage_content_update_trigger
    BEFORE UPDATE ON homepage_content_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

DROP TRIGGER IF EXISTS admin_settings_update_trigger ON admin_settings;
CREATE TRIGGER admin_settings_update_trigger
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();