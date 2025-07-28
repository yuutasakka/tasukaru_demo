-- 048_fix_admin_credentials_access.sql
-- Fix RLS policies for admin_credentials table to allow anon key access

-- First, let's check the current table structure
DO $$
DECLARE
    col_record RECORD;
    nullable_columns text[] := ARRAY['phone_number', 'email', 'backup_code', 'backup_code_created_at', 'two_factor_secret'];
BEGIN
    -- Make all optional columns nullable
    FOR col_record IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin_credentials' 
        AND column_name = ANY(nullable_columns)
        AND is_nullable = 'NO'
    LOOP
        EXECUTE format('ALTER TABLE admin_credentials ALTER COLUMN %I DROP NOT NULL', col_record.column_name);
        RAISE NOTICE 'Made column % nullable', col_record.column_name;
    END LOOP;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage admin_credentials" ON admin_credentials;
DROP POLICY IF EXISTS "Allow read with anon key for login" ON admin_credentials;
DROP POLICY IF EXISTS "Service role full access" ON admin_credentials;
DROP POLICY IF EXISTS "Anon can read username only" ON admin_credentials;
DROP POLICY IF EXISTS "Public username check" ON admin_credentials;

-- Ensure RLS is enabled
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create new policies
-- 1. Service role can do everything
CREATE POLICY "Service role full access" ON admin_credentials
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. Public read for username existence check (allows anon key)
CREATE POLICY "Public username check" ON admin_credentials
    FOR SELECT
    USING (true); -- Allow all reads

-- Grant necessary permissions
GRANT SELECT ON admin_credentials TO anon;
GRANT ALL ON admin_credentials TO service_role;

-- Delete existing admin user if exists (to avoid conflicts)
DELETE FROM admin_credentials WHERE username = 'admin';

-- Add admin user with all required fields
-- First, let's see what columns exist
DO $$
DECLARE
    column_list text;
    insert_query text;
BEGIN
    -- Get all columns except id and timestamps
    SELECT string_agg(
        CASE 
            WHEN column_name = 'username' THEN '''admin'''
            WHEN column_name = 'password_hash' THEN '''$2a$10$X3wY6Z8kQ9l2M5nR4pT7vO1uS3jH2gK8fL0xV9bC6mN7eW5dY4qZ2'''
            WHEN column_name = 'is_active' THEN 'true'
            WHEN column_name = 'role' THEN '''admin'''
            WHEN column_name = 'failed_login_attempts' THEN '0'
            WHEN column_name = 'is_locked' THEN 'false'
            WHEN column_name IN ('phone_number', 'email', 'backup_code', 'two_factor_secret') THEN 'NULL'
            WHEN data_type LIKE 'timestamp%' THEN 'NULL'
            WHEN data_type = 'boolean' THEN 'false'
            WHEN data_type LIKE 'int%' THEN '0'
            ELSE 'NULL'
        END, ', ' ORDER BY ordinal_position
    ) INTO insert_query
    FROM information_schema.columns
    WHERE table_name = 'admin_credentials'
    AND column_name NOT IN ('id', 'created_at', 'updated_at')
    AND column_name NOT LIKE '%_at';

    -- Get column names
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO column_list
    FROM information_schema.columns
    WHERE table_name = 'admin_credentials'
    AND column_name NOT IN ('id', 'created_at', 'updated_at')
    AND column_name NOT LIKE '%_at';

    -- Execute the insert
    EXECUTE format('INSERT INTO admin_credentials (%s) VALUES (%s)', column_list, insert_query);
    
    RAISE NOTICE 'Admin user created successfully';
END $$;

-- Verify the setup
SELECT 
    'Table structure:' as info;
    
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_credentials'
ORDER BY ordinal_position;

SELECT 
    'Policies:' as info,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'admin_credentials';

SELECT 
    'Admin user:' as info,
    username,
    is_active,
    CASE WHEN password_hash IS NOT NULL THEN 'Password set' ELSE 'No password' END as password_status
FROM admin_credentials
WHERE username = 'admin';