-- Create admins table first (required for admin_registrations foreign key)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_username ON public.admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON public.admins(is_active);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can read all admin records" ON public.admins
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can update their own record" ON public.admins
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION update_admins_updated_at();

-- Grant permissions
GRANT ALL ON public.admins TO authenticated;
GRANT SELECT ON public.admins TO anon;

-- Insert default admin user (for demo purposes)
-- Password: Admin123! (you should change this in production)
INSERT INTO public.admins (username, email, password_hash, full_name, role)
VALUES (
    'admin',
    'admin@aiconectx.com',
    '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
    'システム管理者',
    'super_admin'
) ON CONFLICT (username) DO NOTHING;