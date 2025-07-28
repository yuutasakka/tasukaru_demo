-- 管理者ユーザー情報をSupabaseに安全に格納
-- パスワードはbcryptでハッシュ化されています

-- admin_credentialsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS admin_credentials (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(20),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存の管理者データを削除（もしあれば）
DELETE FROM admin_credentials WHERE username = 'admin';

-- 新しい管理者情報を挿入
-- パスワード: zg79juX!3ij5 をbcryptでハッシュ化したもの
INSERT INTO admin_credentials (
  username, 
  password_hash, 
  email, 
  role, 
  is_active,
  created_at,
  updated_at
) VALUES (
  'admin',
  '$2b$12$2.XNU3sFZZ3CMiZoUYeFJOnTi89Tpwe7eKQJLY/cMizD1Id9.VZ7m',
  'admin@taskal.jp',
  'super_admin',
  TRUE,
  NOW(),
  NOW()
);

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_admin_credentials_username ON admin_credentials(username);
CREATE INDEX IF NOT EXISTS idx_admin_credentials_active ON admin_credentials(is_active);

-- 作成確認
SELECT 
  id,
  username,
  email,
  role,
  is_active,
  created_at
FROM admin_credentials 
WHERE username = 'admin';