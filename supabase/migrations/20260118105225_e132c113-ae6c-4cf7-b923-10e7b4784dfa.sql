-- Add branding columns to organizations table
ALTER TABLE public.organizations ADD COLUMN logo_url TEXT;
ALTER TABLE public.organizations ADD COLUMN brand_color TEXT DEFAULT '#1E3A8A';
ALTER TABLE public.organizations ADD COLUMN welcome_message TEXT;