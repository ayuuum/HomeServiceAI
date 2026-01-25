-- Add admin_line_user_id to organizations table for admin notifications
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_line_user_id TEXT;

-- Comment for documentation
COMMENT ON COLUMN organizations.admin_line_user_id IS 'LINE user ID of the administrator to receive notifications';
