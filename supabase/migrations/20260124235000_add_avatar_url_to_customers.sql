-- Add avatar_url column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update create_customer_secure function to handle avatar_url
CREATE OR REPLACE FUNCTION public.create_customer_secure(
  p_organization_id UUID,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_address_building TEXT DEFAULT NULL,
  p_line_user_id TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  -- Validate that organization_id exists
  SELECT EXISTS(
    SELECT 1 FROM public.organizations WHERE id = p_organization_id
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RAISE EXCEPTION 'Invalid organization_id: organization does not exist';
  END IF;
  
  -- Generate new customer ID
  v_customer_id := gen_random_uuid();
  
  -- Insert the customer
  INSERT INTO public.customers (
    id,
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
    v_customer_id,
    p_organization_id,
    p_name,
    p_email,
    p_phone,
    p_postal_code,
    p_address,
    p_address_building,
    p_line_user_id,
    p_avatar_url
  );
  
  RETURN v_customer_id;
END;
$$;

-- Re-grant execute to both roles with the new signature
GRANT EXECUTE ON FUNCTION public.create_customer_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Comment for documentation
COMMENT ON COLUMN customers.avatar_url IS 'URL to the customer profile picture (e.g. from LINE)';
