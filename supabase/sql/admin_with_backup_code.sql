-- phone_number と backup_code が NOT NULL 制約のあるテーブル用の管理者挿入SQL

-- 既存の管理者データを削除
DELETE FROM admin_credentials WHERE username = 'admin';

-- 管理者情報を挿入（phone_numberとbackup_codeを含む）
INSERT INTO admin_credentials (
  username, 
  password_hash,
  phone_number,
  backup_code
) VALUES (
  'admin',
  '$2b$12$2.XNU3sFZZ3CMiZoUYeFJOnTi89Tpwe7eKQJLY/cMizD1Id9.VZ7m',
  '0120-123-456',
  'BACKUP123456789'
);

-- 結果確認
SELECT username, phone_number, backup_code, created_at FROM admin_credentials WHERE username = 'admin';