-- Fix Security Definer View warning by using security_invoker
-- But we need a different approach: use a SECURITY DEFINER function instead

-- Drop the view
DROP VIEW IF EXISTS public.organizations_public;

-- Create a SECURITY DEFINER function to get public org info
CREATE OR REPLACE FUNCTION public.get_organization_public(org_slug TEXT)
RETURNS TABLE(id UUID, name TEXT, slug TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, created_at, updated_at
  FROM public.organizations
  WHERE slug = org_slug
$$;

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION public.get_organization_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_organization_public(TEXT) TO authenticated;