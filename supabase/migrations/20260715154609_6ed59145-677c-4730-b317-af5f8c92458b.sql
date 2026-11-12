
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.contact_submissions;

CREATE POLICY "Anyone can submit a lead"
  ON public.contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (site_id IS NOT NULL OR template_id IS NOT NULL)
    AND (coalesce(length(email), 0) > 0 OR coalesce(length(phone), 0) > 0)
    AND coalesce(length(message), 0) BETWEEN 1 AND 2000
    AND coalesce(length(name), 0) <= 200
  );
