-- ========================================
-- シンプル予約システムへのマイグレーション
-- LINE連携、マルチテナント、スタッフ管理を削除
-- ========================================

-- 1. 最初にすべてのRLSポリシーを削除（各テーブルから）

-- services
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Users can manage own store services" ON services;

-- service_options
DROP POLICY IF EXISTS "Anyone can view service options" ON service_options;
DROP POLICY IF EXISTS "Users can manage own store options" ON service_options;

-- bookings
DROP POLICY IF EXISTS "Users can view own store bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own store bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete own store bookings" ON bookings;

-- booking_services
DROP POLICY IF EXISTS "Users can view booking services" ON booking_services;
DROP POLICY IF EXISTS "Anyone can create booking services" ON booking_services;

-- booking_options
DROP POLICY IF EXISTS "Users can view booking options" ON booking_options;
DROP POLICY IF EXISTS "Anyone can create booking options" ON booking_options;

-- customers
DROP POLICY IF EXISTS "Users can view own store customers" ON customers;
DROP POLICY IF EXISTS "Users can create customers for own store" ON customers;
DROP POLICY IF EXISTS "Users can update own store customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own store customers" ON customers;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can create profiles" ON profiles;

-- staffs (削除前にポリシーを削除)
DROP POLICY IF EXISTS "Users can view own store staff" ON staffs;
DROP POLICY IF EXISTS "Users can manage own store staff" ON staffs;

-- stores
DROP POLICY IF EXISTS "Users can view own store" ON stores;
DROP POLICY IF EXISTS "HQ can manage all stores" ON stores;

-- chat_logs
DROP POLICY IF EXISTS "Users can view own store chats" ON chat_logs;
DROP POLICY IF EXISTS "Users can create chats for own store" ON chat_logs;

-- line_messages
DROP POLICY IF EXISTS "Authenticated users can view all line messages" ON line_messages;
DROP POLICY IF EXISTS "Authenticated users can create line messages" ON line_messages;

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "HQ can manage roles" ON user_roles;

-- 2. assign_default_roleトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- 3. 不要なテーブルを削除
DROP TABLE IF EXISTS line_messages CASCADE;
DROP TABLE IF EXISTS chat_logs CASCADE;
DROP TABLE IF EXISTS staffs CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- 4. 不要になったDB関数を削除
DROP FUNCTION IF EXISTS get_user_store_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_hq_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;

-- 5. app_role enumを削除
DROP TYPE IF EXISTS app_role CASCADE;

-- 6. 各テーブルからstore_id, staff_id列を削除
ALTER TABLE services DROP COLUMN IF EXISTS store_id;
ALTER TABLE service_options DROP COLUMN IF EXISTS store_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS store_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS staff_id;
ALTER TABLE customers DROP COLUMN IF EXISTS store_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS store_id;

-- 7. 新しいシンプルなRLSポリシーを作成

-- services: 認証済みユーザーがCRUD可能、未認証でもSELECT可能
CREATE POLICY "Anyone can view services"
ON services FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can manage services"
ON services FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- service_options
CREATE POLICY "Anyone can view service options"
ON service_options FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage service options"
ON service_options FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- bookings
CREATE POLICY "Anyone can create bookings"
ON bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can view bookings"
ON bookings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (true);

-- booking_services
CREATE POLICY "Anyone can create booking services"
ON booking_services FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can view booking services"
ON booking_services FOR SELECT
TO authenticated
USING (true);

-- booking_options
CREATE POLICY "Anyone can create booking options"
ON booking_options FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can view booking options"
ON booking_options FOR SELECT
TO authenticated
USING (true);

-- customers
CREATE POLICY "Authenticated users can view customers"
ON customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can create customers"
ON customers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
ON customers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete customers"
ON customers FOR DELETE
TO authenticated
USING (true);

-- profiles
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "System can create profiles"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());