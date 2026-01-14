-- Fix security issue: Restrict storage access to organization scope
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete service images" ON storage.objects;

-- Create organization-scoped upload policy
CREATE POLICY "Users can upload to own org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Create organization-scoped delete policy
CREATE POLICY "Users can delete own org files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Fix security issue: Restrict booking_services and booking_options to organization scope
DROP POLICY IF EXISTS "Authenticated users can view booking services" ON booking_services;
DROP POLICY IF EXISTS "Anyone can create booking services" ON booking_services;

CREATE POLICY "Users can view own org booking services"
ON booking_services FOR SELECT
TO authenticated
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can create booking services for own org"
ON booking_services FOR INSERT
TO authenticated
WITH CHECK (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE organization_id = get_user_organization_id()
  )
);

-- Allow anonymous booking service creation (for public booking page)
CREATE POLICY "Anyone can create booking services for new bookings"
ON booking_services FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view booking options" ON booking_options;
DROP POLICY IF EXISTS "Anyone can create booking options" ON booking_options;

CREATE POLICY "Users can view own org booking options"
ON booking_options FOR SELECT
TO authenticated
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can create booking options for own org"
ON booking_options FOR INSERT
TO authenticated
WITH CHECK (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE organization_id = get_user_organization_id()
  )
);

-- Allow anonymous booking option creation (for public booking page)
CREATE POLICY "Anyone can create booking options for new bookings"
ON booking_options FOR INSERT
TO anon
WITH CHECK (true);