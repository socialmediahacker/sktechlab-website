-- 1. Private copy of the permission helper so the public API schema stops exposing it.
CREATE OR REPLACE FUNCTION app_private.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.module = _module AND p.action = _action
  )
$$;
REVOKE ALL ON FUNCTION app_private.has_permission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_permission(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Rewrite every policy that calls the public helpers so it calls the private ones instead.
DO $do$
DECLARE
  r record; q text; w text; roles_txt text; stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual::text AS qual, with_check::text AS wc
    FROM pg_policies
    WHERE schemaname IN ('public','storage')
      AND (COALESCE(qual::text,'') ~ '(^|[^.\w])has_(role|permission)\('
        OR COALESCE(with_check::text,'') ~ '(^|[^.\w])has_(role|permission)\(')
  LOOP
    q := regexp_replace(regexp_replace(r.qual, '(^|[^.\w])has_role\(', '\1app_private.has_role(', 'g'),
                        '(^|[^.\w])has_permission\(', '\1app_private.has_permission(', 'g');
    w := regexp_replace(regexp_replace(r.wc, '(^|[^.\w])has_role\(', '\1app_private.has_role(', 'g'),
                        '(^|[^.\w])has_permission\(', '\1app_private.has_permission(', 'g');

    SELECT string_agg(quote_ident(x), ', ') INTO roles_txt FROM unnest(r.roles) AS x;
    IF roles_txt IS NULL OR r.roles = '{public}'::name[] THEN roles_txt := 'PUBLIC'; END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END, r.cmd, roles_txt);
    IF q IS NOT NULL THEN stmt := stmt || format(' USING (%s)', q); END IF;
    IF w IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)', w); END IF;
    EXECUTE stmt;
  END LOOP;
END
$do$;

-- 3. Remove the API-exposed SECURITY DEFINER helpers entirely (private copies remain).
DROP FUNCTION IF EXISTS public.has_permission(uuid, text, text);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 4. api_integrations: admin-only reads.
DROP POLICY IF EXISTS "api_integrations readable by everyone" ON public.api_integrations;
CREATE POLICY "api_integrations admin read" ON public.api_integrations
  FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin') OR app_private.has_role(auth.uid(), 'super_admin'));
REVOKE SELECT ON public.api_integrations FROM anon;
GRANT ALL ON public.api_integrations TO service_role;

-- 5. blog_comments: hide commenter email from API roles.
REVOKE SELECT ON public.blog_comments FROM anon, authenticated;
GRANT SELECT (id, post_id, user_id, author_name, body, status, approved_at, created_at)
  ON public.blog_comments TO anon, authenticated;
GRANT ALL ON public.blog_comments TO service_role;

-- 6. payment_gateways: hide the credentials blob from API roles.
DO $do$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='payment_gateways' AND column_name <> 'config';
  EXECUTE 'REVOKE SELECT ON public.payment_gateways FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.payment_gateways TO anon, authenticated', cols);
END
$do$;
GRANT ALL ON public.payment_gateways TO service_role;

-- 7. site_settings: hide payment / notification identifiers from API roles.
DO $do$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='site_settings'
    AND column_name NOT IN ('manual_upi_id','manual_upi_name','manual_qr_url',
      'crypto_wallet_address','crypto_network','crypto_qr_url',
      'razorpay_key_id','email_reply_to','email_admin_recipient');
  EXECUTE 'REVOKE SELECT ON public.site_settings FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.site_settings TO anon, authenticated', cols);
END
$do$;
GRANT ALL ON public.site_settings TO service_role;