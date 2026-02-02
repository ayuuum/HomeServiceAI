-- Drop existing function and recreate with line_liff_id
DROP FUNCTION IF EXISTS public.get_organization_public(text);

CREATE OR REPLACE FUNCTION public.get_organization_public(org_slug text)
 RETURNS TABLE(id uuid, name text, slug text, logo_url text, brand_color text, welcome_message text, header_layout text, booking_headline text, line_liff_id text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, slug, logo_url, brand_color, welcome_message, header_layout, booking_headline, line_liff_id, created_at, updated_at
  FROM public.organizations
  WHERE slug = org_slug
$function$;