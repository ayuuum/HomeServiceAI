-- Fix remaining security issues

-- Fix booking_options: Restrict SELECT to admins only
DROP POLICY IF EXISTS "Anyone can view booking options" ON public.booking_options;

CREATE POLICY "Only admins can view booking options"
ON public.booking_options
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Keep INSERT for booking flow (anon users need to create booking_options when booking)
-- The existing "Anyone can insert booking options" policy is fine for the booking flow

-- Clean up duplicate booking policies
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Keep only "Guests can insert bookings" for the public booking flow
-- This allows unauthenticated users to create bookings, which is the intended behavior

-- Add comment to explain the security model
COMMENT ON TABLE public.bookings IS 'Bookings can be created by anyone (for public booking flow), but only admins can view/modify them';
COMMENT ON TABLE public.booking_options IS 'Booking options can be inserted during booking creation, but only admins can view them';