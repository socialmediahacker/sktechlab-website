CREATE OR REPLACE FUNCTION app_private.can_edit_site(_user_id uuid, _site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT _user_id IS NOT NULL AND (
    app_private.has_role(_user_id, 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.sites s
      WHERE s.id = _site_id
        AND s.user_id = _user_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.service_orders so
            JOIN public.service_plans sp ON sp.id = so.plan_id
            WHERE so.user_id = _user_id
              AND so.status = 'active'::public.order_status
              AND sp.service_type = 'site_subscription'::public.service_type
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = _user_id
              AND (
                NULLIF(p.active_plan, '') IS NOT NULL
                OR (NULLIF(p.plan_tier, '') IS NOT NULL AND p.plan_tier <> 'trial')
                OR (p.plan_tier = 'trial' AND p.trial_ends_at > now())
              )
          )
        )
    )
  );
$$;

REVOKE ALL ON FUNCTION app_private.can_edit_site(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_edit_site(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Owner updates sites" ON public.sites;
CREATE POLICY "Entitled owner updates sites"
ON public.sites
FOR UPDATE
TO authenticated
USING (app_private.can_edit_site(auth.uid(), id))
WITH CHECK (app_private.can_edit_site(auth.uid(), id));

DROP POLICY IF EXISTS "products owner write" ON public.products;
CREATE POLICY "products entitled site editor write"
ON public.products
FOR ALL
TO authenticated
USING (app_private.can_edit_site(auth.uid(), site_id))
WITH CHECK (app_private.can_edit_site(auth.uid(), site_id));

DROP POLICY IF EXISTS "collections owner manage" ON public.store_collections;
CREATE POLICY "collections entitled site editor manage"
ON public.store_collections
FOR ALL
TO authenticated
USING (app_private.can_edit_site(auth.uid(), site_id))
WITH CHECK (app_private.can_edit_site(auth.uid(), site_id));

DROP POLICY IF EXISTS "coupons owner manage" ON public.store_coupons;
CREATE POLICY "coupons entitled site editor manage"
ON public.store_coupons
FOR ALL
TO authenticated
USING (app_private.can_edit_site(auth.uid(), site_id))
WITH CHECK (app_private.can_edit_site(auth.uid(), site_id));

DROP POLICY IF EXISTS "orders owner update" ON public.orders;
CREATE POLICY "orders entitled site editor update"
ON public.orders
FOR UPDATE
TO authenticated
USING (app_private.can_edit_site(auth.uid(), site_id))
WITH CHECK (app_private.can_edit_site(auth.uid(), site_id));