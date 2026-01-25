-- Create or replace get_organization_public function to include line_liff_id
CREATE OR REPLACE FUNCTION get_organization_public(org_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  brand_color text,
  welcome_message text,
  header_layout text,
  line_liff_id text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, 
    name, 
    slug, 
    logo_url, 
    brand_color, 
    welcome_message, 
    header_layout, 
    line_liff_id,
    created_at, 
    updated_at
  FROM organizations
  WHERE slug = org_slug;
$$;
