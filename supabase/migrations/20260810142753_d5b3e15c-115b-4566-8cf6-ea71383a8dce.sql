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