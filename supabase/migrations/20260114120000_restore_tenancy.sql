-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create a default organization for existing data
INSERT INTO public.organizations (id, name)
SELECT '00000000-0000-0000-0000-000000000000', 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations);

-- Add organization_id to profiles if check constraint allows
-- First, add the column as nullable
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to other tables
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.service_options 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Update existing data to belong to the default organization
UPDATE public.profiles SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL;
UPDATE public.customers SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL;
UPDATE public.bookings SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL;
UPDATE public.services SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL;
UPDATE public.service_options SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL;

-- Now make organization_id NOT NULL where appropriate
ALTER TABLE public.customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN organization_id SET NOT NULL;
-- Services and options might be global templates in some designs, but for strict tenant isolation, we usually want them scoped.
-- However, for now, let's keep them nullable or strictly scoped? The plan said "Shared" vs "Isolated". The user wants "My Store Only".
-- So we should enforce it.
ALTER TABLE public.services ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.service_options ALTER COLUMN organization_id SET NOT NULL;
-- Profiles: A user might not be assigned to an org immediately upon auth creation? 
-- Usually safer to keep nullable initially or ensure the trigger sets it. 
-- We'll keep it nullable for profiles for flexibility, or enforce if we have a trigger.
-- Let's keep nullable for profiles to be safe.

-- Create RLS Policies

-- ORGANIZATIONS
-- Users can view their own organization
CREATE POLICY "Users can view own organization"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- PROFILES
-- Users can view profiles in their organization
CREATE POLICY "Users can view profiles in own organization"
  ON public.profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
  );

-- CUSTOMERS
-- Enable RLS (already enabled but good to ensure)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- Drop existing loose policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "Users can view own org customers"
  ON public.customers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create customers for own org"
  ON public.customers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org customers"
  ON public.customers FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org customers"
  ON public.customers FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- BOOKINGS
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can delete bookings" ON public.bookings;

CREATE POLICY "Users can view own org bookings"
  ON public.bookings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- For creation, we might need to allow if the user provides the correct org_id
CREATE POLICY "Users can create bookings for own org"
  ON public.bookings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org bookings"
  ON public.bookings FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org bookings"
  ON public.bookings FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- PUBLIC BOOKINGS (Important for the booking page)
CREATE POLICY "Public can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);


-- SERVICES
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;

-- Allow public access to view services? Maybe only if they belong to a specific org (for booking page).
-- For now, let's assume public booking page needs to see services. 
-- BUT, which services? The services for the store being booked.
-- If we have a booking page, it typically targets a specific org.
-- For now, we will allow viewing all services if no org filter is applied? 
-- No, that defeats the purpose.
-- Ideally, the query filters by org_id, and RLS ensures you can only see that org's services.
-- But "Anyone" (unauthenticated) needs to see services to book.
-- We need a policy for unauthenticated users to view services of a target organization.
-- Since unauthenticated users don't have a profile, we might need to allow `SELECT` based on strict criteria or just allow public READ for services if they are "active".
-- Let's revert to a slightly stricter but public-friendly policy for services:
-- "Anyone can view services" -> TRUE (Simplest for public booking pages)
-- OR restricted by a parameter?
-- Let's stick to "Anyone can view services" for now because public customers need to see them.
-- But for MANAGE (Insert/Update/Delete), it MUST be restricted.

CREATE POLICY "Anyone can view services"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own org services"
  ON public.services FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- SERVICE OPTIONS
DROP POLICY IF EXISTS "Anyone can view service options" ON public.service_options;
DROP POLICY IF EXISTS "Authenticated users can manage service options" ON public.service_options;

CREATE POLICY "Anyone can view service options"
  ON public.service_options FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own org service options"
  ON public.service_options FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
