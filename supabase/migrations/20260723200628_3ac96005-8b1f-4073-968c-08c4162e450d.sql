ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS starter_free_domain_root text DEFAULT 'sktechlab.site',
  ADD COLUMN IF NOT EXISTS default_map_query text DEFAULT 'Sanganer Jaipur Rajasthan India',
  ADD COLUMN IF NOT EXISTS default_map_embed_url text DEFAULT 'https://www.google.com/maps?q=Sanganer%20Jaipur%20Rajasthan%20India&output=embed',
  ADD COLUMN IF NOT EXISTS manual_upi_id text,
  ADD COLUMN IF NOT EXISTS manual_upi_name text DEFAULT 'SKTECHLAB',
  ADD COLUMN IF NOT EXISTS manual_qr_url text,
  ADD COLUMN IF NOT EXISTS crypto_payment_note text,
  ADD COLUMN IF NOT EXISTS razorpay_key_id text,
  ADD COLUMN IF NOT EXISTS ecommerce_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS woocommerce_plan_tier text DEFAULT 'business';

ALTER TABLE public.service_plans
  ADD COLUMN IF NOT EXISTS entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  location text,
  rating integer NOT NULL DEFAULT 5,
  text text NOT NULL,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view active reviews" ON public.reviews
    FOR SELECT TO anon, authenticated
    USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage reviews" ON public.reviews
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  CREATE POLICY "Anyone can view enabled payment gateways" ON public.payment_gateways
    FOR SELECT TO anon, authenticated
    USING (is_enabled = true OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.reviews (name, role, location, rating, text, photo_url, is_active, sort_order)
SELECT * FROM (VALUES
  ('Amit Sharma', 'Salon Owner', 'Sanganer, Jaipur', 5, 'SKTECHLAB ne hamara salon website aur Google profile ekdum premium bana diya. Online booking aur WhatsApp leads daily aa rahe hain.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop', true, 1),
  ('Priya Jain', 'Boutique Founder', 'Mansarovar, Jaipur', 5, 'Design dekhte hi clients impressed ho gaye. Gallery, products aur payment flow simple hai, aur website mobile par bahut fast hai.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop', true, 2),
  ('Rahul Verma', 'Restaurant Manager', 'Malviya Nagar, Jaipur', 5, 'Menu, offers aur WhatsApp order system launch ke same din ready tha. Website human-made premium feel deti hai.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop', true, 3),
  ('Nisha Khan', 'Fitness Coach', 'Jagatpura, Jaipur', 5, 'AI builder se design pick kiya aur editor me photos/text change karna easy tha. Support team bhi quick hai.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&auto=format&fit=crop', true, 4)
) AS seed(name, role, location, rating, text, photo_url, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.reviews);