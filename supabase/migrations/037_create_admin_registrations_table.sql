-- Create admin_registrations table
-- Note: This depends on the admins table, so run 036_create_admins_table.sql first
CREATE TABLE IF NOT EXISTS public.admin_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    reason TEXT,
    department VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.admins(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_admin_registrations_email ON public.admin_registrations(email);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_admin_registrations_status ON public.admin_registrations(status);

-- Enable RLS
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read pending registrations" ON public.admin_registrations
    FOR SELECT
    TO public
    USING (status = 'pending');

CREATE POLICY "Admins can manage registrations" ON public.admin_registrations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admin_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_registrations_updated_at
    BEFORE UPDATE ON public.admin_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_registrations_updated_at();

-- Grant permissions
GRANT ALL ON public.admin_registrations TO authenticated;
GRANT SELECT ON public.admin_registrations TO anon;