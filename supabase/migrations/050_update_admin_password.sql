-- 管理者パスワードを更新するマイグレーション
-- パスワード: Admin123!

-- 新しいbcryptハッシュ（Admin123!）
UPDATE admin_credentials 
SET 
    password_hash = '$2b$10$X1ytQRM9lTlPctq4BO12ZuPlETzqdkQil31923gc8y7MlV5jFoG/G',
    updated_at = NOW(),
    password_changed_at = NOW()
WHERE username = 'admin';

-- 確認
SELECT 
    username,
    is_active,
    LENGTH(password_hash) as hash_length,
    updated_at
FROM admin_credentials
WHERE username = 'admin';