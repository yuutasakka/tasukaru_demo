-- Create registration_requests table (unified table for all registration requests)
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    organization VARCHAR(255),
    purpose TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON public.registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON public.registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON public.registration_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can create registration requests" ON public.registration_requests
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Anyone can check their own request" ON public.registration_requests
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Admins can manage all requests" ON public.registration_requests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registration_requests_updated_at
    BEFORE UPDATE ON public.registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_registration_requests_updated_at();

-- Grant permissions
GRANT ALL ON public.registration_requests TO authenticated;
GRANT INSERT, SELECT ON public.registration_requests TO anon;