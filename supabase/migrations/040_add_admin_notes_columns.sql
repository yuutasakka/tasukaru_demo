-- Add missing columns to admin_registrations table for approval workflow

-- Add admin_notes column for approval/rejection notes
ALTER TABLE public.admin_registrations 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add reviewed_by column to track who reviewed the request
ALTER TABLE public.admin_registrations 
ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100);

-- Add reviewed_at column to track when the request was reviewed
ALTER TABLE public.admin_registrations 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Rename reason to purpose for consistency with frontend
ALTER TABLE public.admin_registrations 
RENAME COLUMN reason TO purpose;

-- Rename department to organization for consistency with frontend
ALTER TABLE public.admin_registrations 
RENAME COLUMN department TO organization;

-- Update the trigger to handle the new columns
CREATE OR REPLACE FUNCTION update_admin_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment on the new columns
COMMENT ON COLUMN public.admin_registrations.admin_notes IS 'Notes added by admin during approval/rejection process';
COMMENT ON COLUMN public.admin_registrations.reviewed_by IS 'Identifier of the admin who reviewed this request';
COMMENT ON COLUMN public.admin_registrations.reviewed_at IS 'Timestamp when the request was reviewed';
COMMENT ON COLUMN public.admin_registrations.purpose IS 'Purpose or reason for the admin registration request';
COMMENT ON COLUMN public.admin_registrations.organization IS 'Organization or department of the requesting user';