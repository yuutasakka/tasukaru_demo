-- admin_credentialsテーブルの構造確認と修正

-- 既存のテーブル構造を確認
\d admin_credentials;

-- テーブルが存在しない場合は作成、存在する場合は必要なカラムを追加
DO $$
BEGIN
    -- テーブルが存在しない場合は作成
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_credentials') THEN
        CREATE TABLE admin_credentials (
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
    ELSE
        -- テーブルが存在する場合、必要なカラムを追加
        -- emailカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'email') THEN
            ALTER TABLE admin_credentials ADD COLUMN email VARCHAR(255);
        END IF;
        
        -- phone_numberカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'phone_number') THEN
            ALTER TABLE admin_credentials ADD COLUMN phone_number VARCHAR(20);
        END IF;
        
        -- roleカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'role') THEN
            ALTER TABLE admin_credentials ADD COLUMN role VARCHAR(50) DEFAULT 'admin';
        END IF;
        
        -- is_activeカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'is_active') THEN
            ALTER TABLE admin_credentials ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        
        -- last_loginカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'last_login') THEN
            ALTER TABLE admin_credentials ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- login_attemptsカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'login_attempts') THEN
            ALTER TABLE admin_credentials ADD COLUMN login_attempts INTEGER DEFAULT 0;
        END IF;
        
        -- locked_untilカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'locked_until') THEN
            ALTER TABLE admin_credentials ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- created_atカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'created_at') THEN
            ALTER TABLE admin_credentials ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- updated_atカラムがない場合は追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_credentials' AND column_name = 'updated_at') THEN
            ALTER TABLE admin_credentials ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END
$$;