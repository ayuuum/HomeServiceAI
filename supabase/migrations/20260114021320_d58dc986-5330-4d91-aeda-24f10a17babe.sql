-- Update handle_new_user function to create organization for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
BEGIN
  -- Get business name from user metadata (fallback to name or email)
  org_name := COALESCE(
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  
  -- Generate slug: lowercase, replace non-alphanumeric with dash, append unique suffix
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) 
              || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- Create new organization
  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;
  
  -- Create profile with organization_id
  INSERT INTO public.profiles (id, email, name, organization_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new_org_id
  );
  
  RETURN new;
END;
$$;