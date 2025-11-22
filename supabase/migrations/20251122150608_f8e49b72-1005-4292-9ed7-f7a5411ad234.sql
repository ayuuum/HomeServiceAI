-- Fix security issues: Restrict access to sensitive data

-- Drop existing overly permissive policies on bookings table
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;

-- Create admin-only SELECT policy for bookings
CREATE POLICY "Only admins can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow guests to insert their own bookings (for booking flow)
CREATE POLICY "Guests can insert bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Drop overly permissive policies on service_options
DROP POLICY IF EXISTS "Anyone can delete service options" ON public.service_options;
DROP POLICY IF EXISTS "Anyone can insert service options" ON public.service_options;
DROP POLICY IF EXISTS "Anyone can update service options" ON public.service_options;
DROP POLICY IF EXISTS "Anyone can view service options" ON public.service_options;

-- Create public read access for service_options (needed for booking flow)
CREATE POLICY "Anyone can view service options"
ON public.service_options
FOR SELECT
TO anon, authenticated
USING (true);

-- Restrict modifications to admins only
CREATE POLICY "Only admins can insert service options"
ON public.service_options
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update service options"
ON public.service_options
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete service options"
ON public.service_options
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Protect services table similarly
DROP POLICY IF EXISTS "Anyone can delete services" ON public.services;
DROP POLICY IF EXISTS "Anyone can insert services" ON public.services;
DROP POLICY IF EXISTS "Anyone can update services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;

-- Public read for services (needed for service menu)
CREATE POLICY "Anyone can view services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (true);

-- Admin-only modifications
CREATE POLICY "Only admins can insert services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update services"
ON public.services
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete services"
ON public.services
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));