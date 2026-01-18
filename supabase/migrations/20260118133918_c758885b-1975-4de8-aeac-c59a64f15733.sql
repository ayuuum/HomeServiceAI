-- Step 1: Add header_layout column
ALTER TABLE public.organizations 
ADD COLUMN header_layout TEXT DEFAULT 'logo_and_name';