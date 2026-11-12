
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- keep authenticated EXECUTE on has_role so client code can call it if needed; policies use it regardless
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
