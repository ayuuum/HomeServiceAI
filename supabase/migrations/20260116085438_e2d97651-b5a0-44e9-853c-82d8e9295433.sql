-- =============================================
-- Fix: Customers Table INSERT Security
-- Validate organization_id before allowing customer creation
-- =============================================

-- Step 1: Create a secure function for customer creation
CREATE OR REPLACE FUNCTION public.create_customer_secure(
  p_organization_id UUID,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_address_building TEXT DEFAULT NULL,
  p_line_user_id TEXT DEFAULT NULL
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
    line_user_id
  ) VALUES (
    v_customer_id,
    p_organization_id,
    p_name,
    p_email,
    p_phone,
    p_postal_code,
    p_address,
    p_address_building,
    p_line_user_id
  );
  
  RETURN v_customer_id;
END;
$$;

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION public.create_customer_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 2: Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create customers with org" ON public.customers;

-- Step 3: Create a restrictive INSERT policy for authenticated org members only
-- This is a fallback for authenticated users (admins) who can still insert directly
CREATE POLICY "Authenticated users can create customers for their org"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Note: Anonymous users must use the create_customer_secure function
-- The SECURITY DEFINER function bypasses RLS