
-- Add service_set_discounts JSONB column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS service_set_discounts JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN public.organizations.service_set_discounts IS 'Array of set discount definitions: [{id, title, service_ids, discount_rate, description}]';
