-- Function to fetch bookings by line_user_id securely via RPC
CREATE OR REPLACE FUNCTION get_customer_bookings_by_line_id(p_line_user_id TEXT, p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  selected_date DATE,
  selected_time TIME,
  status TEXT,
  total_price NUMERIC,
  customer_name TEXT,
  service_titles TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.selected_date,
    b.selected_time,
    b.status,
    b.total_price,
    b.customer_name,
    COALESCE(ARRAY_AGG(bs.service_title) FILTER (WHERE bs.service_title IS NOT NULL), ARRAY[]::TEXT[]) as service_titles
  FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  LEFT JOIN booking_services bs ON b.id = bs.booking_id
  WHERE c.line_user_id = p_line_user_id
    AND b.organization_id = p_organization_id
    AND b.status != 'cancelled'
  GROUP BY b.id, b.selected_date, b.selected_time, b.status, b.total_price, b.customer_name
  ORDER BY b.selected_date DESC, b.selected_time DESC;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_customer_bookings_by_line_id(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_customer_bookings_by_line_id(TEXT, UUID) TO authenticated;
