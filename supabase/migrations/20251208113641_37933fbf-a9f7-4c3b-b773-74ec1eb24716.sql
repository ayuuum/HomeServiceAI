
-- ========================================
-- Phase 1: Helper Functions for RLS
-- ========================================

-- Get user's store_id from profiles
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM profiles WHERE id = _user_id
$$;

-- Check if user is HQ admin
CREATE OR REPLACE FUNCTION public.is_hq_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'hq_admin'
  )
$$;

-- ========================================
-- Phase 2: Drop Development Policies
-- ========================================

DROP POLICY IF EXISTS "Allow all for development" ON bookings;
DROP POLICY IF EXISTS "Allow all for development" ON booking_services;
DROP POLICY IF EXISTS "Allow all for development" ON booking_options;
DROP POLICY IF EXISTS "Allow all for development" ON customers;
DROP POLICY IF EXISTS "Allow all for development" ON staffs;
DROP POLICY IF EXISTS "Allow all for development" ON services;
DROP POLICY IF EXISTS "Allow all for development" ON service_options;
DROP POLICY IF EXISTS "Allow all for development" ON stores;
DROP POLICY IF EXISTS "Allow all for development" ON chat_logs;
DROP POLICY IF EXISTS "Allow all for development" ON profiles;
DROP POLICY IF EXISTS "Allow all for development" ON user_roles;

-- ========================================
-- Phase 3: Production RLS Policies
-- ========================================

-- BOOKINGS: Users see own store's bookings, HQ sees all
CREATE POLICY "Users can view own store bookings" ON bookings
FOR SELECT TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
  OR store_id IS NULL
);

CREATE POLICY "Anyone can create bookings" ON bookings
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own store bookings" ON bookings
FOR UPDATE TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can delete own store bookings" ON bookings
FOR DELETE TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

-- BOOKING_SERVICES: Follow booking access
CREATE POLICY "Users can view booking services" ON booking_services
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id 
    AND (b.store_id = get_user_store_id(auth.uid()) OR is_hq_admin(auth.uid()) OR b.store_id IS NULL)
  )
);

CREATE POLICY "Anyone can create booking services" ON booking_services
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- BOOKING_OPTIONS: Follow booking access
CREATE POLICY "Users can view booking options" ON booking_options
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id 
    AND (b.store_id = get_user_store_id(auth.uid()) OR is_hq_admin(auth.uid()) OR b.store_id IS NULL)
  )
);

CREATE POLICY "Anyone can create booking options" ON booking_options
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- CUSTOMERS: Users see own store customers
CREATE POLICY "Users can view own store customers" ON customers
FOR SELECT TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can create customers for own store" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can update own store customers" ON customers
FOR UPDATE TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can delete own store customers" ON customers
FOR DELETE TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

-- STAFFS: Users see own store staff
CREATE POLICY "Users can view own store staff" ON staffs
FOR SELECT TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can manage own store staff" ON staffs
FOR ALL TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

-- SERVICES: Public read, authenticated write for own store
CREATE POLICY "Anyone can view active services" ON services
FOR SELECT TO anon, authenticated
USING (is_active = true OR store_id IS NULL);

CREATE POLICY "Users can manage own store services" ON services
FOR ALL TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
  OR store_id IS NULL
);

-- SERVICE_OPTIONS: Public read, authenticated write
CREATE POLICY "Anyone can view service options" ON service_options
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Users can manage own store options" ON service_options
FOR ALL TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
  OR store_id IS NULL
);

-- STORES: HQ sees all, others see own store
CREATE POLICY "Users can view own store" ON stores
FOR SELECT TO authenticated
USING (
  id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "HQ can manage all stores" ON stores
FOR ALL TO authenticated
USING (is_hq_admin(auth.uid()));

-- CHAT_LOGS: Users see own store chats
CREATE POLICY "Users can view own store chats" ON chat_logs
FOR SELECT TO authenticated
USING (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can create chats for own store" ON chat_logs
FOR INSERT TO authenticated
WITH CHECK (
  store_id = get_user_store_id(auth.uid()) 
  OR is_hq_admin(auth.uid())
);

-- PROFILES: Users can view/edit own profile, HQ sees all
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "System can create profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- USER_ROLES: Only HQ can manage, users can view own
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR is_hq_admin(auth.uid())
);

CREATE POLICY "HQ can manage roles" ON user_roles
FOR ALL TO authenticated
USING (is_hq_admin(auth.uid()));
