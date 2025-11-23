-- Drop existing policies
DROP POLICY IF EXISTS "Guests can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can insert booking options" ON public.booking_options;

-- Create explicit permissive policies for anon role
CREATE POLICY "Guests can insert bookings" 
ON public.bookings
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can insert booking options" 
ON public.booking_options
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);