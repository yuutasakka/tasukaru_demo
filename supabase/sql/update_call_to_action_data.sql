-- CallToActionSectionのデータを資金調達サービスに合わせて更新

-- 既存のcall_to_action_sectionsデータを削除
DELETE FROM call_to_action_sections;

-- 資金調達サービスに適したCTAデータを挿入
INSERT INTO call_to_action_sections (
  section_title,
  section_subtitle,
  main_description,
  phone_number,
  phone_hours,
  campaign_title,
  campaign_description,
  created_at,
  updated_at
) VALUES (
  'あなたの事業の未来を',
  '今日から始めませんか？',
  '経験豊富な資金調達のプロフェッショナルが、あなたの事業規模と資金需要に合わせた最適な調達方法を無料でご提案いたします。',
  '0120-999-888（平日 9:00-18:00）',
  '平日 9:00-18:00',
  '初回相談無料キャンペーン',
  '資金調達のプロが、あなたの事業状況に合わせて最適な調達プランをご提案します。銀行融資からファクタリングまで、幅広い選択肢から最良の方法を見つけられます。',
  NOW(),
  NOW()
);

-- 結果確認
SELECT 
  section_title,
  section_subtitle,
  main_description,
  phone_number,
  phone_hours,
  campaign_title,
  campaign_description
FROM call_to_action_sections;