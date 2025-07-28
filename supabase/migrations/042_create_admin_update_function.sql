-- Create SQL function to update admin registration status with elevated privileges

-- Create function to update admin registration status
CREATE OR REPLACE FUNCTION update_admin_registration_status(
    request_id UUID,
    new_status TEXT,
    admin_notes TEXT DEFAULT '',
    reviewed_by_admin TEXT DEFAULT 'admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner (postgres)
AS $$
DECLARE
    result_record RECORD;
    result_json JSON;
BEGIN
    -- Validate status
    IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Invalid status value'
        );
    END IF;

    -- Update the record
    UPDATE public.admin_registrations 
    SET 
        status = new_status,
        approved_by = CASE 
            WHEN new_status = 'approved' THEN NULL -- Could be set to actual admin UUID
            ELSE approved_by 
        END,
        approved_at = CASE 
            WHEN new_status = 'approved' THEN CURRENT_TIMESTAMP
            ELSE approved_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = request_id
    RETURNING * INTO result_record;

    -- Check if record was found and updated
    IF result_record IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Registration request not found'
        );
    END IF;

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', CASE 
            WHEN new_status = 'approved' THEN 'Registration approved successfully'
            WHEN new_status = 'rejected' THEN 'Registration rejected successfully'
            ELSE 'Status updated successfully'
        END,
        'data', row_to_json(result_record)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false, 
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION update_admin_registration_status(UUID, TEXT, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION update_admin_registration_status(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_admin_registration_status(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION update_admin_registration_status IS 'Updates admin registration status with elevated privileges to bypass RLS';