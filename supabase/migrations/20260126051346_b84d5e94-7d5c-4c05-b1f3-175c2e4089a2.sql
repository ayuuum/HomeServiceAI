CREATE OR REPLACE FUNCTION public.generate_cancel_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cancel_token IS NULL THEN
    -- gen_random_uuid() は組み込み関数なのでスキーマ制限の影響を受けない
    NEW.cancel_token := replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$function$;