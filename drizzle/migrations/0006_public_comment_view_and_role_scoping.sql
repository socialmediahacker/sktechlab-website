-- Public comments are served through a view that has no email column at all.
CREATE OR REPLACE VIEW public.blog_comments_public AS
  SELECT id, post_id, author_name, body, created_at
  FROM public.blog_comments
  WHERE status = 'approved';

GRANT SELECT ON public.blog_comments_public TO anon, authenticated;

-- Remove direct public read access on the base table.
DROP POLICY IF EXISTS "Approved comments are public" ON public.blog_comments;
REVOKE SELECT ON public.blog_comments FROM anon;
REVOKE SELECT ON public.blog_comments FROM authenticated;
GRANT SELECT (id, post_id, user_id, author_name, body, status, approved_at, created_at)
  ON public.blog_comments TO authenticated;

-- Users may only see the permission rows for roles they actually hold.
DROP POLICY IF EXISTS "Authenticated can read role permissions" ON public.role_permissions;
CREATE POLICY "Read own role permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = role_permissions.role
    )
  );