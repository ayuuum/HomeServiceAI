-- Development-only: Allow all operations for anonymous users on all tables
-- WARNING: This is for development only. Implement proper RLS policies in production.

-- Drop existing policies and create development policies for stores
DROP POLICY IF EXISTS "HQ admins can manage all stores" ON public.stores;
DROP POLICY IF EXISTS "Store users can view their store" ON public.stores;
CREATE POLICY "Allow all for development" ON public.stores FOR ALL USING (true) WITH CHECK (true);

-- staffs table
DROP POLICY IF EXISTS "HQ admins can manage all staff" ON public.staffs;
DROP POLICY IF EXISTS "Store users can view their store staff" ON public.staffs;
DROP POLICY IF EXISTS "Store owners can manage their store staff" ON public.staffs;
CREATE POLICY "Allow all for development" ON public.staffs FOR ALL USING (true) WITH CHECK (true);

-- customers table
DROP POLICY IF EXISTS "HQ admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Store users can view their store customers" ON public.customers;
DROP POLICY IF EXISTS "Store users can manage their store customers" ON public.customers;
CREATE POLICY "Allow all for development" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- bookings table
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "HQ admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Store users can view their store bookings" ON public.bookings;
DROP POLICY IF EXISTS "HQ admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Store users can manage their store bookings" ON public.bookings;
CREATE POLICY "Allow all for development" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

-- booking_services table
DROP POLICY IF EXISTS "Anyone can insert booking services" ON public.booking_services;
DROP POLICY IF EXISTS "HQ admins can view all booking services" ON public.booking_services;
DROP POLICY IF EXISTS "Store users can view their store booking services" ON public.booking_services;
CREATE POLICY "Allow all for development" ON public.booking_services FOR ALL USING (true) WITH CHECK (true);

-- booking_options table
DROP POLICY IF EXISTS "Anyone can insert booking options" ON public.booking_options;
DROP POLICY IF EXISTS "HQ admins can view all booking options" ON public.booking_options;
DROP POLICY IF EXISTS "Store users can view their store booking options" ON public.booking_options;
CREATE POLICY "Allow all for development" ON public.booking_options FOR ALL USING (true) WITH CHECK (true);

-- services table
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
DROP POLICY IF EXISTS "Store users can view their store services" ON public.services;
CREATE POLICY "Allow all for development" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- service_options table
DROP POLICY IF EXISTS "Anyone can view service options" ON public.service_options;
DROP POLICY IF EXISTS "Store users can view their store options" ON public.service_options;
CREATE POLICY "Allow all for development" ON public.service_options FOR ALL USING (true) WITH CHECK (true);

-- chat_logs table
DROP POLICY IF EXISTS "HQ admins can view all chat logs" ON public.chat_logs;
DROP POLICY IF EXISTS "Store users can view their store chat logs" ON public.chat_logs;
DROP POLICY IF EXISTS "Store users can insert chat logs" ON public.chat_logs;
CREATE POLICY "Allow all for development" ON public.chat_logs FOR ALL USING (true) WITH CHECK (true);

-- profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "HQ admins can manage all profiles" ON public.profiles;
CREATE POLICY "Allow all for development" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "HQ admins can manage all roles" ON public.user_roles;
CREATE POLICY "Allow all for development" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);