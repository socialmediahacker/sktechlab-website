
DROP POLICY IF EXISTS "anyone can submit custom dev request" ON public.custom_dev_requests;
CREATE POLICY "anyone can submit custom dev request"
ON public.custom_dev_requests FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 2 AND 120
  AND length(btrim(email)) BETWEEN 5 AND 200
  AND email LIKE '%_@_%.__%'
  AND length(btrim(whatsapp)) BETWEEN 6 AND 25
  AND length(btrim(requirements)) BETWEEN 5 AND 4000
);
