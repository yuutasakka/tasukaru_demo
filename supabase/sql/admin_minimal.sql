-- 最小限の管理者データ挿入（どのテーブル構造でも動作）
-- admin_credentialsテーブルの基本カラムのみを使用

-- 既存の管理者データを削除
DELETE FROM admin_credentials WHERE username = 'admin';

-- 管理者情報を挿入（基本カラムのみ）
INSERT INTO admin_credentials (username, password_hash) 
VALUES ('admin', '$2b$12$2.XNU3sFZZ3CMiZoUYeFJOnTi89Tpwe7eKQJLY/cMizD1Id9.VZ7m');

-- 結果確認
SELECT * FROM admin_credentials WHERE username = 'admin';