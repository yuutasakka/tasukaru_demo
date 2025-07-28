-- SecurityTrustSectionのデフォルトデータを直接更新する代替手法
-- テーブルが存在しない場合はコンポーネント内のデフォルトデータ変更を推奨

-- 1. まず既存のテーブル構造を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%trust%' 
    OR table_name LIKE '%security%'
    OR table_name LIKE '%section%'
    OR table_name LIKE '%homepage%')
ORDER BY table_name;

-- 2. homepage_content_settingsテーブルが存在する場合の確認
-- このクエリは結果がなくてもエラーになりません
SELECT setting_key, setting_value::text as setting_value_text
FROM homepage_content_settings 
WHERE setting_key LIKE '%trust%' 
   OR setting_key LIKE '%security%'
LIMIT 10;

-- 3. security_trust_sectionsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.security_trust_sections (
    id SERIAL PRIMARY KEY,
    section_title VARCHAR(255) DEFAULT '安心・安全への取り組み',
    trust_item_1_title VARCHAR(255),
    trust_item_1_description TEXT,
    trust_item_2_title VARCHAR(255),
    trust_item_2_description TEXT,
    trust_item_3_title VARCHAR(255),
    trust_item_3_description TEXT,
    trust_item_4_title VARCHAR(255),
    trust_item_4_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLSを有効化
ALTER TABLE public.security_trust_sections ENABLE ROW LEVEL SECURITY;

-- 5. パブリックアクセスポリシーを作成
CREATE POLICY IF NOT EXISTS "security_trust_sections_public_read" ON public.security_trust_sections
    FOR SELECT TO public USING (true);

CREATE POLICY IF NOT EXISTS "security_trust_sections_authenticated_all" ON public.security_trust_sections
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. データを挿入
INSERT INTO public.security_trust_sections (
    trust_item_1_title,
    trust_item_1_description,
    trust_item_2_title,
    trust_item_2_description,
    trust_item_3_title,
    trust_item_3_description,
    trust_item_4_title,
    trust_item_4_description
) VALUES (
    'SSL暗号化',
    '最高水準のセキュリティでお客様の事業情報を保護',
    '金融機関連携',
    '信頼できる金融機関・ファクタリング会社のみご紹介',
    'プライバシーマーク',
    '個人情報保護の第三者認証取得済み',
    '営業電話なし',
    'お客様からのご依頼がない限り一切連絡いたしません'
)
ON CONFLICT DO NOTHING;

-- 7. 結果確認
SELECT 
    section_title,
    trust_item_1_title,
    trust_item_1_description,
    trust_item_2_title,
    trust_item_2_description,
    trust_item_3_title,
    trust_item_3_description,
    trust_item_4_title,
    trust_item_4_description
FROM public.security_trust_sections;