-- Fix permissions and RLS policies for admin_registrations table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read pending registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.admin_registrations;

-- Temporarily disable RLS to fix the table
ALTER TABLE public.admin_registrations DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to both authenticated and anonymous users
GRANT ALL ON public.admin_registrations TO authenticated;
GRANT ALL ON public.admin_registrations TO anon;
GRANT ALL ON public.admin_registrations TO public;

-- Re-enable RLS
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;

-- Create more permissive RLS policies
CREATE POLICY "Allow all operations on admin_registrations" ON public.admin_registrations
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Alternative: Create separate policies for different operations
CREATE POLICY "Anyone can read admin_registrations" ON public.admin_registrations
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Anyone can insert admin_registrations" ON public.admin_registrations
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Anyone can update admin_registrations" ON public.admin_registrations
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete admin_registrations" ON public.admin_registrations
    FOR DELETE
    TO public
    USING (true);

-- Grant sequence permissions if needed
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;

-- Make sure the table has proper ownership
ALTER TABLE public.admin_registrations OWNER TO postgres;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';