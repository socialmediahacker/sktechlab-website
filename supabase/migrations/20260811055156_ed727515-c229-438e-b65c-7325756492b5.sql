CREATE TABLE IF NOT EXISTS public.domain_roots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root text NOT NULL UNIQUE,
  nameservers text[] NOT NULL DEFAULT '{}',
  a_record text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.domain_roots TO anon;
GRANT SELECT ON public.domain_roots TO authenticated;
GRANT ALL ON public.domain_roots TO service_role;

ALTER TABLE public.domain_roots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active domain roots"
ON public.domain_roots FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage domain roots"
ON public.domain_roots FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER domain_roots_updated_at
BEFORE UPDATE ON public.domain_roots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.domain_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'nameserver';

INSERT INTO public.domain_roots (root, nameservers, a_record, sort_order, note)
VALUES ('sktechlab.site', ARRAY['ns1.sktechlab.com','ns2.sktechlab.com'], '185.158.133.1', 0, 'Default free subdomain root')
ON CONFLICT (root) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text := regexp_replace(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'whatsapp_number', ''), '[^0-9]', '', 'g');
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
    OR right(_phone, 10) = '9887193936';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);
  RETURN NEW;
END;
$function$;