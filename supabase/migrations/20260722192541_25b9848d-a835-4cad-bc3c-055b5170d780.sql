GRANT SELECT (id, name, content_json, published, subdomain) ON public.sites TO anon;

DROP POLICY IF EXISTS "Public can view sites by subdomain" ON public.sites;
CREATE POLICY "Public can view sites by subdomain"
ON public.sites
FOR SELECT
TO anon
USING (subdomain IS NOT NULL);