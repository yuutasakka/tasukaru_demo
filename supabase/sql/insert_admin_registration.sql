-- admin_registrationsテーブルにサンプルデータを挿入

-- 既存データがあれば削除
DELETE FROM admin_registrations WHERE email = 'sales@seai.co.jp';

-- 管理者登録データを挿入（実際のテーブル構造に合わせて修正）
INSERT INTO admin_registrations (
  full_name,
  email,
  password_hash,
  department,
  phone_number,
  reason,
  role,
  status,
  approved_at
) VALUES (
  '田中 営業太郎（株式会社SEAI・営業部長）',
  'sales@seai.co.jp',
  '$2b$12$2.XNU3sFZZ3CMiZoUYeFJOnTi89Tpwe7eKQJLY/cMizD1Id9.VZ7m', -- パスワード: zg79juX!3ij5
  '営業部',
  '03-1234-5678',
  'タスカル管理画面での顧客管理と分析業務のため。株式会社SEAIの営業部長として、顧客データの管理と売上分析を担当します。',
  'admin',
  'approved',
  NOW()
);

-- 結果確認
SELECT 
  full_name,
  email,
  department,
  status,
  approved_at,
  created_at
FROM admin_registrations 
WHERE email = 'sales@seai.co.jp';