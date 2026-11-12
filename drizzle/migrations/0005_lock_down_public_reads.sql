-- 1) Commenter emails must never be readable by visitors.
REVOKE SELECT ON public.blog_comments FROM anon;
REVOKE SELECT ON public.blog_comments FROM authenticated;
GRANT SELECT (id, post_id, user_id, author_name, body, status, approved_at, created_at)
  ON public.blog_comments TO anon, authenticated;
GRANT INSERT (post_id, user_id, author_name, author_email, body, status)
  ON public.blog_comments TO anon, authenticated;
GRANT ALL ON public.blog_comments TO service_role;

-- 2) Payment gateway credentials (config jsonb) must never be publicly readable.
DROP POLICY IF EXISTS "Anyone can view enabled payment gateways" ON public.payment_gateways;
DROP POLICY IF EXISTS "gateways public read enabled" ON public.payment_gateways;
CREATE POLICY "gateways admin read" ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.payment_gateways FROM anon;
GRANT SELECT ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;