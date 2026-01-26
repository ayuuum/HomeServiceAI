-- Create find_or_create_customer function for customer matching
-- This function searches for existing customers by line_user_id, phone, or email
-- and creates a new customer if no match is found

CREATE OR REPLACE FUNCTION public.find_or_create_customer(
  p_organization_id uuid,
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_address_building text DEFAULT NULL,
  p_line_user_id text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_normalized_phone text;
  v_org_exists boolean;
BEGIN
  -- Validate organization exists
  SELECT EXISTS(
    SELECT 1 FROM public.organizations WHERE id = p_organization_id
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RAISE EXCEPTION 'Invalid organization_id: organization does not exist';
  END IF;

  -- 1. Search by line_user_id (highest priority)
  IF p_line_user_id IS NOT NULL AND p_line_user_id <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE line_user_id = p_line_user_id
      AND organization_id = p_organization_id;
    
    IF v_customer_id IS NOT NULL THEN
      -- Update customer info and return
      UPDATE public.customers SET
        name = COALESCE(NULLIF(p_name, ''), name),
        email = COALESCE(NULLIF(p_email, ''), email),
        phone = COALESCE(NULLIF(p_phone, ''), phone),
        postal_code = COALESCE(NULLIF(p_postal_code, ''), postal_code),
        address = COALESCE(NULLIF(p_address, ''), address),
        address_building = COALESCE(NULLIF(p_address_building, ''), address_building),
        avatar_url = COALESCE(NULLIF(p_avatar_url, ''), avatar_url),
        updated_at = now()
      WHERE id = v_customer_id;
      RETURN v_customer_id;
    END IF;
  END IF;

  -- 2. Search by phone number (normalized)
  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    
    IF v_normalized_phone <> '' THEN
      SELECT id INTO v_customer_id
      FROM public.customers
      WHERE organization_id = p_organization_id
        AND regexp_replace(phone, '[^0-9]', '', 'g') = v_normalized_phone;
      
      IF v_customer_id IS NOT NULL THEN
        -- Link line_user_id if not already set, update other info
        UPDATE public.customers SET
          line_user_id = COALESCE(line_user_id, NULLIF(p_line_user_id, '')),
          name = COALESCE(NULLIF(p_name, ''), name),
          email = COALESCE(NULLIF(p_email, ''), email),
          postal_code = COALESCE(NULLIF(p_postal_code, ''), postal_code),
          address = COALESCE(NULLIF(p_address, ''), address),
          address_building = COALESCE(NULLIF(p_address_building, ''), address_building),
          avatar_url = COALESCE(NULLIF(p_avatar_url, ''), avatar_url),
          updated_at = now()
        WHERE id = v_customer_id;
        RETURN v_customer_id;
      END IF;
    END IF;
  END IF;

  -- 3. Search by email
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE LOWER(email) = LOWER(p_email)
      AND organization_id = p_organization_id;
    
    IF v_customer_id IS NOT NULL THEN
      -- Link line_user_id if not already set, update other info
      UPDATE public.customers SET
        line_user_id = COALESCE(line_user_id, NULLIF(p_line_user_id, '')),
        name = COALESCE(NULLIF(p_name, ''), name),
        phone = COALESCE(NULLIF(p_phone, ''), phone),
        postal_code = COALESCE(NULLIF(p_postal_code, ''), postal_code),
        address = COALESCE(NULLIF(p_address, ''), address),
        address_building = COALESCE(NULLIF(p_address_building, ''), address_building),
        avatar_url = COALESCE(NULLIF(p_avatar_url, ''), avatar_url),
        updated_at = now()
      WHERE id = v_customer_id;
      RETURN v_customer_id;
    END IF;
  END IF;

  -- 4. No match found - create new customer
  INSERT INTO public.customers (
    organization_id,
    name,
    email,
    phone,
    postal_code,
    address,
    address_building,
    line_user_id,
    avatar_url
  ) VALUES (
    p_organization_id,
    p_name,
    NULLIF(p_email, ''),
    NULLIF(p_phone, ''),
    NULLIF(p_postal_code, ''),
    NULLIF(p_address, ''),
    NULLIF(p_address_building, ''),
    NULLIF(p_line_user_id, ''),
    NULLIF(p_avatar_url, '')
  ) RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;