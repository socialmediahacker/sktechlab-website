
DROP POLICY IF EXISTS "orders public insert" ON public.orders;
CREATE POLICY "orders public insert" ON public.orders FOR INSERT WITH CHECK (
  length(trim(buyer_name)) > 0
  AND length(trim(buyer_phone)) >= 6
  AND total_inr >= 0
  AND (buyer_user_id IS NULL OR buyer_user_id = auth.uid())
);
