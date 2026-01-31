-- Function to reschedule booking by token
CREATE OR REPLACE FUNCTION reschedule_booking_by_token(
  p_token TEXT,
  p_new_date DATE,
  p_new_time TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE bookings 
  SET 
    selected_date = p_new_date,
    selected_time = p_new_time,
    updated_at = NOW()
  WHERE cancel_token = p_token 
    AND status IN ('pending', 'confirmed');
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;