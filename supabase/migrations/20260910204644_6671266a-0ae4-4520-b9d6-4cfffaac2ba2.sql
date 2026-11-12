DROP POLICY IF EXISTS "Public can view sites by subdomain" ON public.sites;
CREATE POLICY "Public can view published sites by subdomain"
ON public.sites FOR SELECT TO anon, authenticated
USING (subdomain IS NOT NULL AND published = true);

REVOKE SELECT ON public.blog_comments FROM anon;
GRANT SELECT (id, post_id, author_name, body, status, approved_at, created_at) ON public.blog_comments TO anon;

REVOKE SELECT ON public.api_integrations FROM anon;
GRANT SELECT (id, provider, label, enabled, created_at, updated_at) ON public.api_integrations TO anon;