-- Phase 1: 既存データのクリーンアップ
TRUNCATE booking_options, booking_services, bookings, service_options, services, user_roles CASCADE;

-- Phase 2: ENUMの拡張
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('hq_admin', 'store_owner', 'store_staff');

-- Phase 3: 新規テーブル作成

-- 店舗マスタ
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  line_channel_token TEXT,
  line_channel_secret TEXT,
  is_hq BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- スタッフマスタ
CREATE TABLE staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_code TEXT DEFAULT '#3b82f6',
  line_user_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 顧客マスタ
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  line_user_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザープロファイル
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LINEチャットログ
CREATE TABLE chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sender TEXT CHECK (sender IN ('user', 'bot', 'staff')),
  message TEXT,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 4: 既存テーブルの修正

-- servicesテーブル
ALTER TABLE services 
  ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  ADD COLUMN is_active BOOLEAN DEFAULT true;

-- service_optionsテーブル
ALTER TABLE service_options 
  ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- bookingsテーブル
ALTER TABLE bookings 
  ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN staff_id UUID REFERENCES staffs(id) ON DELETE SET NULL;

-- Phase 5: user_rolesテーブルの再作成
DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Phase 6: has_role関数の更新
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Phase 7: RLSポリシーの設定

-- stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ admins can manage all stores"
ON stores FOR ALL
USING (has_role(auth.uid(), 'hq_admin'))
WITH CHECK (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store"
ON stores FOR SELECT
USING (
  id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

-- staffs
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ admins can manage all staff"
ON staffs FOR ALL
USING (has_role(auth.uid(), 'hq_admin'))
WITH CHECK (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store staff"
ON staffs FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Store owners can manage their store staff"
ON staffs FOR ALL
USING (
  has_role(auth.uid(), 'store_owner') AND
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'store_owner') AND
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
);

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ admins can manage all customers"
ON customers FOR ALL
USING (has_role(auth.uid(), 'hq_admin'))
WITH CHECK (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store customers"
ON customers FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Store users can manage their store customers"
ON customers FOR ALL
USING (
  (has_role(auth.uid(), 'store_owner') OR has_role(auth.uid(), 'store_staff')) AND
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'store_owner') OR has_role(auth.uid(), 'store_staff')) AND
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
);

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "HQ admins can manage all profiles"
ON profiles FOR ALL
USING (has_role(auth.uid(), 'hq_admin'))
WITH CHECK (has_role(auth.uid(), 'hq_admin'));

-- chat_logs
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ admins can view all chat logs"
ON chat_logs FOR SELECT
USING (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store chat logs"
ON chat_logs FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Store users can insert chat logs"
ON chat_logs FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

-- bookings (既存ポリシーを更新)
DROP POLICY IF EXISTS "Guests can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Only admins can view bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;

CREATE POLICY "Anyone can insert bookings"
ON bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "HQ admins can view all bookings"
ON bookings FOR SELECT
USING (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store bookings"
ON bookings FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "HQ admins can manage all bookings"
ON bookings FOR ALL
USING (has_role(auth.uid(), 'hq_admin'))
WITH CHECK (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can manage their store bookings"
ON bookings FOR ALL
USING (
  (has_role(auth.uid(), 'store_owner') OR has_role(auth.uid(), 'store_staff')) AND
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'store_owner') OR has_role(auth.uid(), 'store_staff')) AND
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
);

-- services (公開読み取りを維持)
CREATE POLICY "Store users can view their store services"
ON services FOR SELECT
USING (
  store_id IS NULL OR
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
);

-- service_options (公開読み取りを維持)
CREATE POLICY "Store users can view their store options"
ON service_options FOR SELECT
USING (
  store_id IS NULL OR
  store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
);

-- Phase 8: Triggers for updated_at
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON stores
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();