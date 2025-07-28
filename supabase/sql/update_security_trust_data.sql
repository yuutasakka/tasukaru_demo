-- SecurityTrustSectionのデータを資金調達サービスに合わせて更新

-- 既存のsecurity_trust_sectionsデータを削除
DELETE FROM security_trust_sections;

-- 資金調達サービスに適した安心・安全への取り組みデータを挿入
INSERT INTO security_trust_sections (
  section_title,
  trust_item_1_title,
  trust_item_1_description,
  trust_item_2_title,
  trust_item_2_description,
  trust_item_3_title,
  trust_item_3_description,
  trust_item_4_title,
  trust_item_4_description,
  created_at,
  updated_at
) VALUES (
  '安心・安全への取り組み',
  'SSL暗号化',
  '最高水準のセキュリティでお客様の事業情報を保護',
  '金融機関連携',
  '信頼できる金融機関・ファクタリング会社のみご紹介',
  'プライバシーマーク',
  '個人情報保護の第三者認証取得済み',
  '営業電話なし',
  'お客様からのご依頼がない限り一切連絡いたしません',
  NOW(),
  NOW()
);

-- 結果確認
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
FROM security_trust_sections;