-- SecurityTrustSectionとCallToActionSectionのテーブル作成とデータ挿入

-- 1. security_trust_sectionsテーブルを作成
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

-- 2. call_to_action_sectionsテーブルを作成
CREATE TABLE IF NOT EXISTS public.call_to_action_sections (
    id SERIAL PRIMARY KEY,
    section_title VARCHAR(255),
    section_subtitle VARCHAR(255),
    main_description TEXT,
    phone_number VARCHAR(50),
    phone_hours VARCHAR(100),
    campaign_title VARCHAR(255),
    campaign_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLSを有効化
ALTER TABLE public.security_trust_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_to_action_sections ENABLE ROW LEVEL SECURITY;

-- 4. パブリックアクセスポリシーを作成
-- security_trust_sections用
DROP POLICY IF EXISTS "security_trust_sections_public_read" ON public.security_trust_sections;
CREATE POLICY "security_trust_sections_public_read" ON public.security_trust_sections
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "security_trust_sections_authenticated_all" ON public.security_trust_sections;
CREATE POLICY "security_trust_sections_authenticated_all" ON public.security_trust_sections
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- call_to_action_sections用
DROP POLICY IF EXISTS "call_to_action_sections_public_read" ON public.call_to_action_sections;
CREATE POLICY "call_to_action_sections_public_read" ON public.call_to_action_sections
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "call_to_action_sections_authenticated_all" ON public.call_to_action_sections;
CREATE POLICY "call_to_action_sections_authenticated_all" ON public.call_to_action_sections
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. 既存データを削除（テーブルが新規作成の場合は何も削除されない）
DELETE FROM public.security_trust_sections;
DELETE FROM public.call_to_action_sections;

-- 6. SecurityTrustSectionデータを挿入
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
);

-- 7. CallToActionSectionデータを挿入
INSERT INTO public.call_to_action_sections (
    section_title,
    section_subtitle,
    main_description,
    phone_number,
    phone_hours,
    campaign_title,
    campaign_description
) VALUES (
    'あなたの事業の未来を',
    '今日から始めませんか？',
    '経験豊富な資金調達のプロフェッショナルが、あなたの事業規模と資金需要に合わせた最適な調達方法を無料でご提案いたします。',
    '0120-999-888（平日 9:00-18:00）',
    '平日 9:00-18:00',
    '初回相談無料キャンペーン',
    '資金調達のプロが、あなたの事業状況に合わせて最適な調達プランをご提案します。銀行融資からファクタリングまで、幅広い選択肢から最良の方法を見つけられます。'
);

-- 8. 結果確認
SELECT '=== SecurityTrustSection ===' as section;
SELECT 
    section_title,
    trust_item_1_title,
    trust_item_1_description,
    trust_item_2_title,
    trust_item_2_description,
    trust_item_3_title,
    trust_item_3_description,
    trust_item_4_title,
    trust_item_4_description,
    created_at
FROM public.security_trust_sections;

SELECT '=== CallToActionSection ===' as section;
SELECT 
    section_title,
    section_subtitle,
    main_description,
    phone_number,
    phone_hours,
    campaign_title,
    campaign_description,
    created_at
FROM public.call_to_action_sections;