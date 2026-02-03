-- Add business_hours column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS 
  business_hours jsonb DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "friday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "saturday": {"open": "09:00", "close": "17:00", "is_closed": false},
    "sunday": {"open": null, "close": null, "is_closed": true}
  }'::jsonb;

-- Drop the existing function to update return type
DROP FUNCTION IF EXISTS public.get_organization_public(text);

-- Recreate get_organization_public function to include business_hours
CREATE FUNCTION public.get_organization_public(org_slug text)
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  logo_url text, 
  brand_color text, 
  welcome_message text, 
  header_layout text, 
  booking_headline text, 
  line_liff_id text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone,
  business_hours jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id, 
    name, 
    slug, 
    logo_url, 
    brand_color, 
    welcome_message, 
    header_layout, 
    booking_headline, 
    line_liff_id, 
    created_at, 
    updated_at,
    business_hours
  FROM public.organizations
  WHERE slug = org_slug
$$;