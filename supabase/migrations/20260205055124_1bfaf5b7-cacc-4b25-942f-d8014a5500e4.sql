-- Add admin_line_user_id column to organizations table
ALTER TABLE public.organizations
ADD COLUMN admin_line_user_id text;