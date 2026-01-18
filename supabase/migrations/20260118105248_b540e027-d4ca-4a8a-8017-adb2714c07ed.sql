-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_organization_public(text);

-- Create function with new return type including branding fields
CREATE FUNCTION public.get_organization_public(org_slug text)
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  logo_url text,
  brand_color text,
  welcome_message text,
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, name, slug, logo_url, brand_color, welcome_message, created_at, updated_at
  FROM public.organizations
  WHERE slug = org_slug
$$;