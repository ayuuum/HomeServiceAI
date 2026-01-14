-- Fix RLS policies for customers table
DROP POLICY IF EXISTS "Anyone can create customers with org" ON public.customers;
CREATE POLICY "Anyone can create customers with org"
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix RLS policies for bookings table
DROP POLICY IF EXISTS "Anyone can create bookings with org" ON public.bookings;
CREATE POLICY "Anyone can create bookings with org"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix RLS policies for booking_services table
DROP POLICY IF EXISTS "Anyone can create booking services for new bookings" ON public.booking_services;
CREATE POLICY "Anyone can create booking services for new bookings"
ON public.booking_services
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix RLS policies for booking_options table
DROP POLICY IF EXISTS "Anyone can create booking options for new bookings" ON public.booking_options;
CREATE POLICY "Anyone can create booking options for new bookings"
ON public.booking_options
FOR INSERT
TO anon, authenticated
WITH CHECK (true);