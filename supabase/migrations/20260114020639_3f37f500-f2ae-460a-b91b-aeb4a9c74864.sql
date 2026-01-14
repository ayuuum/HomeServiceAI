-- =============================================
-- Phase 1: Create organizations table
-- =============================================

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast slug lookups
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Phase 2: Add organization_id to existing tables
-- =============================================

-- Add to profiles
ALTER TABLE public.profiles 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Add to customers
ALTER TABLE public.customers 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Add to bookings
ALTER TABLE public.bookings 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Add to services
ALTER TABLE public.services 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Add to service_options (via service_id already, but for direct queries)
ALTER TABLE public.service_options 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- =============================================
-- Phase 3: Create helper function (SECURITY DEFINER to avoid RLS recursion)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- =============================================
-- Phase 4: Create default organization and migrate existing data
-- =============================================

-- Create a default organization for existing data
INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default');

-- Migrate existing profiles
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Migrate existing customers
UPDATE public.customers 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Migrate existing bookings
UPDATE public.bookings 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Migrate existing services
UPDATE public.services 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Migrate existing service_options
UPDATE public.service_options 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- =============================================
-- Phase 5: Update RLS policies for organizations table
-- =============================================

-- Anyone can view organization by slug (for public booking pages)
CREATE POLICY "Anyone can view organizations by slug"
  ON public.organizations FOR SELECT
  USING (true);

-- Authenticated users can only manage their own organization
CREATE POLICY "Users can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.get_user_organization_id());

-- =============================================
-- Phase 6: Update RLS policies for customers table
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

-- New organization-based policies
CREATE POLICY "Users can view their organization customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Anyone can create customers with org"
  ON public.customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their organization customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their organization customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- =============================================
-- Phase 7: Update RLS policies for bookings table
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can delete bookings" ON public.bookings;

-- New organization-based policies
CREATE POLICY "Users can view their organization bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Anyone can create bookings with org"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their organization bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their organization bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- =============================================
-- Phase 8: Update RLS policies for services table
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;

-- New organization-based policies
-- Public can view active services for a specific organization (for booking page)
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage their organization services"
  ON public.services FOR ALL
  TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- =============================================
-- Phase 9: Update RLS policies for service_options table
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view service options" ON public.service_options;
DROP POLICY IF EXISTS "Authenticated users can manage service options" ON public.service_options;

-- New organization-based policies
CREATE POLICY "Anyone can view service options"
  ON public.service_options FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their organization service options"
  ON public.service_options FOR ALL
  TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- =============================================
-- Phase 10: Trigger for updated_at on organizations
-- =============================================

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();