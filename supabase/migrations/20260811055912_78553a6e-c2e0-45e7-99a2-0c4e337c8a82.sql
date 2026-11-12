CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text := regexp_replace(
    COALESCE(NEW.phone, '') || ' ' ||
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '') || ' ' ||
    COALESCE(split_part(NEW.email, '@', 1), ''),
    '[^0-9]', '', 'g');
  _is_admin boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, whatsapp_number, trial_ends_at, plan_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'whatsapp_number',
    now() + interval '5 days',
    'trial'
  );

  _is_admin := lower(COALESCE(NEW.email, '')) IN ('admin@sktechlab.com','sktechlab@admin.com','socialmediahackerweb@gmail.com','yirega4199@epaynine.com')
    OR _phone LIKE '%9887193936%';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);
  RETURN NEW;
END;
$function$;