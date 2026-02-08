-- Add service_set_discounts JSONB column to organizations
-- This column stores array of set discount definitions:
-- [{id, title, service_ids[], discount_rate, description}]

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS service_set_discounts JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN organizations.service_set_discounts IS 'Array of set discount definitions: [{id, title, service_ids[], discount_rate, description}]';
