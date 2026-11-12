DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
CREATE POLICY "Admins read permissions" ON public.permissions FOR SELECT TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "keywords readable" ON public.seo_keywords;