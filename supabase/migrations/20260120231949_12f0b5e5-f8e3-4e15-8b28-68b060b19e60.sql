-- Enable pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add cancel token and cancellation tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- Create function to generate cancel token on booking creation
CREATE OR REPLACE FUNCTION generate_cancel_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancel_token IS NULL THEN
    NEW.cancel_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating cancel token
DROP TRIGGER IF EXISTS set_cancel_token ON bookings;
CREATE TRIGGER set_cancel_token
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION generate_cancel_token();

-- Generate cancel tokens for existing bookings that don't have one
UPDATE bookings SET cancel_token = encode(extensions.gen_random_bytes(16), 'hex') WHERE cancel_token IS NULL;

-- RPC function to get booking by cancel token (public access, bypasses RLS)
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
) SECURITY DEFINER AS $$
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

-- RPC function to cancel booking by token (public access, bypasses RLS)
CREATE OR REPLACE FUNCTION cancel_booking_by_token(p_token TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
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