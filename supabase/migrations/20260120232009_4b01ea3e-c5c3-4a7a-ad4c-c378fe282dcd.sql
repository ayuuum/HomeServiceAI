-- Fix search_path for newly created functions
CREATE OR REPLACE FUNCTION generate_cancel_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancel_token IS NULL THEN
    NEW.cancel_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION get_booking_by_cancel_token(p_token TEXT)
RETURNS TABLE(
  id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  selected_date DATE,
  selected_time TEXT,
  total_price INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  organization_id UUID
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    b.id,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.selected_date,
    b.selected_time,
    b.total_price,
    b.status,
    b.created_at,
    b.organization_id
  FROM bookings b
  WHERE b.cancel_token = p_token;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cancel_booking_by_token(p_token TEXT)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE bookings 
  SET 
    status = 'cancelled', 
    cancelled_at = NOW(), 
    cancelled_by = 'customer',
    updated_at = NOW()
  WHERE cancel_token = p_token 
    AND status IN ('pending', 'confirmed');
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;