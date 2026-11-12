CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO service_role;

ALTER POLICY "Admins manage categories" ON public.categories
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage categories" ON public.categories
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "own domain requests" ON public.domain_requests
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage seo" ON public.page_seo
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin read all profiles" ON public.profiles
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin update all profiles" ON public.profiles
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage orders" ON public.service_orders
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage plans" ON public.service_plans
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage service_plans" ON public.service_plans
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage settings" ON public.site_settings
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admin deletes all sites" ON public.sites
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admin selects all sites" ON public.sites
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admin updates all sites" ON public.sites
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage subcategories" ON public.subcategories
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin delete tickets" ON public.support_tickets
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "user own tickets read" ON public.support_tickets
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "user update own tickets" ON public.support_tickets
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage templates" ON public.templates
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage templates" ON public.templates
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admin manage user_roles" ON public.user_roles
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));