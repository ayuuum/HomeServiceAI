-- Add line_liff_id column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS line_liff_id TEXT;

-- Comment for documentation
COMMENT ON COLUMN organizations.line_liff_id IS 'LIFF ID for the organization''s booking page';
