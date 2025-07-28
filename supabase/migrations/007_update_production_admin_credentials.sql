-- 本番環境用管理者認証情報更新
-- 実行前に必ず新しいパスワードとbcryptハッシュを生成してください

-- Step 1: 既存のデフォルト管理者を無効化
UPDATE admin_credentials 
SET 
    is_active = false,
    updated_at = NOW()
WHERE username = 'admin' AND password_hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

-- Step 2: 新しい安全な管理者アカウントを作成
-- ⚠️ 本番環境では以下の値を実際の値に置き換えてください：

INSERT INTO admin_credentials (
    username, 
    password_hash, 
    phone_number, 
    backup_code,
    is_active,
    requires_password_change,
    created_at,
    updated_at,
    password_changed_at
) VALUES (
    'admin0630', -- 本番管理者ユーザー名
    '$2b$12$Db3bqOof8jjyC6qFAMRpPubLdtQZ.3MUn.wikYutSCVNKhvXx8d7.', -- bcryptハッシュ
    '+81-90-0000-0000', -- 本番環境では実際の管理者電話番号に変更してください
    'PROD-BACKUP-' || extract(epoch from now())::text || '-SECURE',
    true,
    true, -- 初回ログイン時にパスワード変更を強制
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    phone_number = EXCLUDED.phone_number,
    backup_code = EXCLUDED.backup_code,
    is_active = EXCLUDED.is_active,
    requires_password_change = EXCLUDED.requires_password_change,
    updated_at = NOW();

-- Step 3: セキュリティ強化設定
UPDATE security_settings 
SET 
    setting_value = '3',
    updated_at = NOW()
WHERE setting_name = 'max_login_attempts';

UPDATE security_settings 
SET 
    setting_value = '1800',
    updated_at = NOW()
WHERE setting_name = 'lockout_duration';

-- Step 4: 監査ログ記録
INSERT INTO audit_logs (
    event_type,
    username,
    description,
    severity,
    metadata,
    created_at
) VALUES (
    'admin_credentials_update',
    'system',
    'Production admin credentials updated for security',
    'critical',
    json_build_object(
        'action', 'production_credentials_update',
        'timestamp', NOW(),
        'previous_admin_disabled', true
    ),
    NOW()
); 