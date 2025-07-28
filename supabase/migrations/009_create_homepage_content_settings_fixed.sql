-- AI ConnectX ホームページコンテンツ設定テーブル作成 - マイグレーション 009 (修正版)
-- エラーで出ている homepage_content_settings テーブルを作成

-- 1. 依存する関数を先に作成
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

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_homepage_content_key ON homepage_content_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_homepage_content_active ON homepage_content_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_content_order ON homepage_content_settings(display_order);

-- 4. Row Level Security (RLS) の有効化
ALTER TABLE homepage_content_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー作成（読み取りは誰でも可能、書き込みは認証済みユーザーのみ）
CREATE POLICY "homepage_content_read_policy" ON homepage_content_settings
    FOR SELECT USING (true);

CREATE POLICY "homepage_content_write_policy" ON homepage_content_settings
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 6. 初期データの挿入
INSERT INTO homepage_content_settings (
    setting_key,
    setting_data,
    title,
    description,
    display_order
) VALUES 
(
    'main_visual_data',
    '{
        "title": "あなたの未来を一緒に描こう♪",
        "subtitle": "無料相談で理想の資産運用プランを見つけませんか？",
        "description": "AI ConnectXで、あなたの夢や目標に合わせた最適な資産運用戦略を専門家と一緒に作りましょう。",
        "buttonText": "無料診断を始める",
        "image_url": "/images/main-visual.jpg"
    }'::jsonb,
    'メインビジュアル設定',
    'トップページのメインビジュアル（ヒーローセクション）の内容設定',
    1
),
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
    2
),
(
    'header_data',
    '{
        "logo": {
            "text": "AI ConnectX",
            "image_url": "/images/logo.png"
        },
        "navigation": [
            {"label": "サービス", "href": "#services"},
            {"label": "診断", "href": "#diagnosis"},
            {"label": "お客様の声", "href": "#testimonials"},
            {"label": "お問い合わせ", "href": "#contact"}
        ],
        "cta_button": {
            "text": "無料診断",
            "href": "#diagnosis"
        },
        "phone": {
            "number": "0120-123-456",
            "hours": "平日 9:00-18:00"
        }
    }'::jsonb,
    'ヘッダー設定',
    'サイトヘッダーのナビゲーションと連絡先情報',
    3
),
(
    'features_section',
    '{
        "title": "AI ConnectXが選ばれる理由",
        "subtitle": "安心・安全・確実な資産運用サポート",
        "features": [
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
    '特徴セクション',
    'サービスの特徴・強みを紹介するセクション',
    4
)
ON CONFLICT (setting_key) DO NOTHING;

-- 7. 更新トリガーの設定
DROP TRIGGER IF EXISTS homepage_content_update_trigger ON homepage_content_settings;
CREATE TRIGGER homepage_content_update_trigger
    BEFORE UPDATE ON homepage_content_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time(); 