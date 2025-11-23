-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Guests can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can insert booking options" ON booking_options;

-- Recreate as permissive policies (default behavior)
CREATE POLICY "Guests can insert bookings" 
ON bookings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can insert booking options" 
ON booking_options 
FOR INSERT 
WITH CHECK (true);