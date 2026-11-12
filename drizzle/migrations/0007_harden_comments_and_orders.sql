-- View should run with the caller's rights, not the owner's.
ALTER VIEW public.blog_comments_public SET (security_invoker = on);

-- Caller needs row access to approved comments, but only on safe columns.
CREATE POLICY "Approved comments are public" ON public.blog_comments
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');
GRANT SELECT (id, post_id, author_name, body, status, created_at)
  ON public.blog_comments TO anon;

-- A visitor may not attribute a comment to another account.
DROP POLICY IF EXISTS "Anyone can submit a comment" ON public.blog_comments;
CREATE POLICY "Anyone can submit a comment" ON public.blog_comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND (user_id IS NULL OR user_id = auth.uid()));

-- Orders may only be placed against a real, published site.
DROP POLICY IF EXISTS "orders public insert" ON public.orders;
CREATE POLICY "orders public insert" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.id = orders.site_id)
    AND char_length(coalesce(buyer_name, '')) BETWEEN 2 AND 120
    AND char_length(coalesce(buyer_phone, '')) BETWEEN 6 AND 20
    AND total_inr >= 0
  );