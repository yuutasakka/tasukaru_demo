-- SMS認証テーブル名統一のためのマイグレーション
-- sms_verification から sms_verifications に統一

BEGIN;

-- Step 1: 古いテーブルが存在する場合、データを新しいテーブルに移行
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sms_verification') THEN
        -- 新しいテーブルが存在しない場合は作成
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sms_verifications') THEN
            CREATE TABLE sms_verifications (
                id BIGSERIAL PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                verification_code VARCHAR(10) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                attempts INTEGER DEFAULT 0,
                is_verified BOOLEAN DEFAULT FALSE,
                verified_at TIMESTAMP WITH TIME ZONE,
                request_ip INET DEFAULT '0.0.0.0'::inet NOT NULL,
                user_agent TEXT
            );
        END IF;
        
        -- データを移行（カラムが一致する場合のみ）
        INSERT INTO sms_verifications (
            phone_number, 
            verification_code, 
            created_at, 
            expires_at, 
            attempts, 
            is_verified, 
            verified_at
        )
        SELECT 
            phone_number, 
            verification_code, 
            created_at, 
            expires_at, 
            COALESCE(attempts, 0), 
            COALESCE(is_verified, FALSE), 
            verified_at
        FROM sms_verification
        ON CONFLICT DO NOTHING;
        
        -- 古いテーブルを削除
        DROP TABLE sms_verification;
        
        RAISE NOTICE 'SMS認証テーブル名を sms_verification から sms_verifications に統一しました';
    ELSE
        RAISE NOTICE 'sms_verification テーブルは存在しません。統一済みです。';
    END IF;
END $$;

-- Step 2: verification_codes テーブルが存在する場合の処理
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'verification_codes') THEN
        RAISE NOTICE 'verification_codes テーブルが見つかりました。必要に応じて統合を検討してください。';
    END IF;
END $$;

COMMIT;