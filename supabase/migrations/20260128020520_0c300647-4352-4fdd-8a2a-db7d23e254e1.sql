-- Add booking_headline column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS booking_headline text DEFAULT NULL;

-- Drop and recreate get_organization_public function with new column
DROP FUNCTION IF EXISTS public.get_organization_public(text);

CREATE FUNCTION public.get_organization_public(org_slug text)
 RETURNS TABLE(id uuid, name text, slug text, logo_url text, brand_color text, welcome_message text, header_layout text, booking_headline text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, slug, logo_url, brand_color, welcome_message, header_layout, booking_headline, created_at, updated_at
  FROM public.organizations
  WHERE slug = org_slug
$function$;