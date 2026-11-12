CREATE OR REPLACE FUNCTION public.can_edit_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, app_private
AS $$
  SELECT app_private.can_edit_site(auth.uid(), _site_id);
$$;

REVOKE ALL ON FUNCTION public.can_edit_site(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_site(uuid) TO authenticated, service_role;