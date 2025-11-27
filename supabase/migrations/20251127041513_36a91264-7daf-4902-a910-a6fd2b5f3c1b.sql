-- booking_services と booking_options のRLSポリシーを更新

-- booking_services
DROP POLICY IF EXISTS "Anyone can insert booking services" ON booking_services;
DROP POLICY IF EXISTS "Only admins can view booking services" ON booking_services;

CREATE POLICY "Anyone can insert booking services"
ON booking_services FOR INSERT
WITH CHECK (true);

CREATE POLICY "HQ admins can view all booking services"
ON booking_services FOR SELECT
USING (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store booking services"
ON booking_services FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings WHERE store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- booking_options
DROP POLICY IF EXISTS "Anyone can insert booking options" ON booking_options;
DROP POLICY IF EXISTS "Only admins can view booking options" ON booking_options;

CREATE POLICY "Anyone can insert booking options"
ON booking_options FOR INSERT
WITH CHECK (true);

CREATE POLICY "HQ admins can view all booking options"
ON booking_options FOR SELECT
USING (has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "Store users can view their store booking options"
ON booking_options FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings WHERE store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
  )
);