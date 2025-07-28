-- 既存のadmin_credentialsテーブル構造に合わせた管理者挿入SQL
-- まず既存のテーブル構造を確認

-- 既存の管理者データを削除（もしあれば）
DELETE FROM admin_credentials WHERE username = 'admin';

-- 基本的なカラムのみで管理者情報を挿入
-- パスワード: zg79juX!3ij5 をbcryptでハッシュ化したもの
INSERT INTO admin_credentials (
  username, 
  password_hash
) VALUES (
  'admin',
  '$2b$12$2.XNU3sFZZ3CMiZoUYeFJOnTi89Tpwe7eKQJLY/cMizD1Id9.VZ7m'
);

-- 作成確認
SELECT * FROM admin_credentials WHERE username = 'admin';