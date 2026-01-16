-- Fix: Allow public access to organizations_public view
-- The view needs security_invoker OFF to allow public access while base table is protected

-- Drop and recreate view without security_invoker (defaults to off)
DROP VIEW IF EXISTS public.organizations_public;

CREATE VIEW public.organizations_public AS
SELECT 
  id,
  name,
  slug,
  created_at,
  updated_at
FROM public.organizations;

-- Grant access to both anonymous and authenticated users
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;

COMMENT ON VIEW public.organizations_public IS 'Public view of organizations table without sensitive LINE API credentials';