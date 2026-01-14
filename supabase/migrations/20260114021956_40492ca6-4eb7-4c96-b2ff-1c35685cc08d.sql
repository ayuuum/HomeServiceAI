-- 1. 既存の田中クリーニングのスラッグを読みやすい形式に更新
UPDATE public.organizations 
SET slug = 'tanaka-cleaning-' || substr(id::text, 1, 8)
WHERE slug = '---------a9240141';

-- 2. handle_new_user 関数を更新して、日本語名でも読みやすいスラッグを生成
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
  cleaned_slug text;
BEGIN
  -- Get business name from user metadata (fallback to name or email)
  org_name := COALESCE(
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  
  -- Generate slug: lowercase, replace non-alphanumeric with dash
  cleaned_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'));
  
  -- Remove consecutive dashes and trim
  cleaned_slug := regexp_replace(cleaned_slug, '-+', '-', 'g');
  cleaned_slug := trim(both '-' from cleaned_slug);
  
  -- If the cleaned slug is empty or too short (e.g., Japanese characters only), use 'shop' prefix
  IF cleaned_slug = '' OR length(cleaned_slug) < 3 THEN
    org_slug := 'shop-' || substr(gen_random_uuid()::text, 1, 8);
  ELSE
    org_slug := cleaned_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;
  
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
$function$;