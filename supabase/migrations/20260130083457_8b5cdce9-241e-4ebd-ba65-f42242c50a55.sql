-- Add admin_email column to organizations table
ALTER TABLE organizations 
ADD COLUMN admin_email text;

-- Migrate existing data: set admin_email to the oldest profile's email for each organization
UPDATE organizations o
SET admin_email = (
  SELECT p.email 
  FROM profiles p 
  WHERE p.organization_id = o.id 
    AND p.email IS NOT NULL 
  ORDER BY p.created_at ASC 
  LIMIT 1
);