
-- 1) Re-grant admin to owner emails
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('socialmediahackerweb@gmail.com','yirega4199@epaynine.com','admin@sktechlab.com','sktechlab@admin.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Custom development enquiries from home page (no login required)
CREATE TABLE IF NOT EXISTS public.custom_dev_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  business_type text,
  budget text,
  requirements text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.custom_dev_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.custom_dev_requests TO authenticated;
GRANT ALL ON public.custom_dev_requests TO service_role;

ALTER TABLE public.custom_dev_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can submit custom dev request" ON public.custom_dev_requests;
CREATE POLICY "anyone can submit custom dev request"
ON public.custom_dev_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "admins read custom dev" ON public.custom_dev_requests;
CREATE POLICY "admins read custom dev"
ON public.custom_dev_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update custom dev" ON public.custom_dev_requests;
CREATE POLICY "admins update custom dev"
ON public.custom_dev_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS custom_dev_requests_updated_at ON public.custom_dev_requests;
CREATE TRIGGER custom_dev_requests_updated_at
BEFORE UPDATE ON public.custom_dev_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
