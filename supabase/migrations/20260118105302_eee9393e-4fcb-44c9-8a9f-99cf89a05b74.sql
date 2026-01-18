-- Create storage bucket for organization logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for organization logos
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated users can upload their org logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = get_user_organization_id()::text
);

CREATE POLICY "Users can update their org logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = get_user_organization_id()::text
);

CREATE POLICY "Users can delete their org logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = get_user_organization_id()::text
);