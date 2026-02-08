-- Secure Booking Creation RPC
-- This function handles booking creation with proper validation and rate limiting

-- First, drop the insecure INSERT policies
DROP POLICY IF EXISTS "Anyone can create bookings with org" ON bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;

-- Create secure RPC for booking creation
CREATE OR REPLACE FUNCTION create_booking_secure(
    p_organization_id UUID,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_address_building TEXT,
    p_customer_postal_code TEXT,
    p_selected_date DATE,
    p_selected_time TEXT,
    p_preference1_date DATE DEFAULT NULL,
    p_preference1_time TEXT DEFAULT NULL,
    p_preference2_date DATE DEFAULT NULL,
    p_preference2_time TEXT DEFAULT NULL,
    p_preference3_date DATE DEFAULT NULL,
    p_preference3_time TEXT DEFAULT NULL,
    p_total_price INTEGER DEFAULT 0,
    p_diagnosis_has_parking BOOLEAN DEFAULT FALSE,
    p_diagnosis_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_status TEXT;
    v_booking_id UUID;
    v_recent_count INTEGER;
BEGIN
    -- 1. Check organization exists and is active
    SELECT status INTO v_org_status
    FROM organizations
    WHERE id = p_organization_id;
    
    IF v_org_status IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    IF v_org_status != 'active' AND v_org_status != 'trial' THEN
        RAISE EXCEPTION 'Organization is not accepting bookings (status: %)', v_org_status;
    END IF;
    
    -- 2. Rate limiting: Check for duplicate submissions (same customer, same date within 1 minute)
    SELECT COUNT(*) INTO v_recent_count
    FROM bookings
    WHERE customer_id = p_customer_id
      AND selected_date = p_selected_date
      AND created_at > NOW() - INTERVAL '1 minute';
    
    IF v_recent_count > 0 THEN
        RAISE EXCEPTION 'Booking already submitted recently. Please wait before trying again.';
    END IF;
    
    -- 3. Check for double booking on same slot
    SELECT COUNT(*) INTO v_recent_count
    FROM bookings
    WHERE organization_id = p_organization_id
      AND selected_date = p_selected_date
      AND selected_time = p_selected_time
      AND status NOT IN ('cancelled');
    
    IF v_recent_count > 0 THEN
        RAISE EXCEPTION 'This time slot is already booked';
    END IF;
    
    -- 4. Create booking
    v_booking_id := gen_random_uuid();
    
    INSERT INTO bookings (
        id,
        organization_id,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        customer_address_building,
        customer_postal_code,
        selected_date,
        selected_time,
        preference1_date,
        preference1_time,
        preference2_date,
        preference2_time,
        preference3_date,
        preference3_time,
        total_price,
        diagnosis_has_parking,
        diagnosis_notes,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_booking_id,
        p_organization_id,
        p_customer_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_customer_address,
        p_customer_address_building,
        p_customer_postal_code,
        p_selected_date,
        p_selected_time,
        p_preference1_date,
        p_preference1_time,
        p_preference2_date,
        p_preference2_time,
        p_preference3_date,
        p_preference3_time,
        p_total_price,
        p_diagnosis_has_parking,
        p_diagnosis_notes,
        'pending',
        NOW(),
        NOW()
    );
    
    RETURN v_booking_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION create_booking_secure TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION create_booking_secure IS 'Secure booking creation with organization status check, rate limiting, and double-booking prevention';
