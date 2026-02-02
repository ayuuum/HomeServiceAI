-- Grant permissions to public (anon) and authenticated users for booking token functions

-- get_booking_by_cancel_token
GRANT EXECUTE ON FUNCTION get_booking_by_cancel_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_booking_by_cancel_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_by_cancel_token(TEXT) TO service_role;

-- cancel_booking_by_token
GRANT EXECUTE ON FUNCTION cancel_booking_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION cancel_booking_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking_by_token(TEXT) TO service_role;

-- reschedule_booking_by_token
GRANT EXECUTE ON FUNCTION reschedule_booking_by_token(TEXT, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION reschedule_booking_by_token(TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reschedule_booking_by_token(TEXT, DATE, TEXT) TO service_role;
