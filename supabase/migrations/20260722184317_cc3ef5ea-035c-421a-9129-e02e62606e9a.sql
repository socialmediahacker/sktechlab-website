
-- ============ site_settings extensions ============
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS email_login_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_provider text NOT NULL DEFAULT 'whatsapp_cloud',
  ADD COLUMN IF NOT EXISTS sms_fallback_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_api_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_popup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS floating_widgets_enabled boolean NOT NULL DEFAULT true;

-- ============ otp_codes extensions ============
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS sent_via text NOT NULL DEFAULT 'whatsapp_cloud',
  ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS otp_codes_phone_created_idx ON public.otp_codes(phone, created_at DESC);

-- ============ plans ============
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price_inr numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  duration_days integer NOT NULL DEFAULT 30,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_gateways text[] NOT NULL DEFAULT ARRAY['razorpay','upi_qr','crypto','manual']::text[],
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  ecom_product_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read active" ON public.plans FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plans admin write" ON public.plans FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ payment_gateways ============
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  display_name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  requires_manual_verification boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_gateways TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gateways public read enabled" ON public.payment_gateways FOR SELECT USING (is_enabled = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gateways admin write" ON public.payment_gateways FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ payment_submissions ============
CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  gateway_kind text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  txn_reference text,
  screenshot_url text,
  payer_note text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_submissions TO authenticated;
GRANT ALL ON public.payment_submissions TO service_role;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments own read" ON public.payment_submissions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payments own insert" ON public.payment_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments admin update" ON public.payment_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payments admin delete" ON public.payment_submissions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER payment_submissions_updated_at BEFORE UPDATE ON public.payment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ products (ecom) ============
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  price_inr numeric(10,2) NOT NULL DEFAULT 0,
  compare_price_inr numeric(10,2),
  stock integer NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read active" ON public.products FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.user_id = auth.uid()));
CREATE POLICY "products owner write" ON public.products FOR ALL USING (EXISTS(SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')) WITH CHECK (EXISTS(SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ orders (ecom storefront) ============
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_email text,
  shipping_address jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_inr numeric(10,2) NOT NULL DEFAULT 0,
  total_inr numeric(10,2) NOT NULL DEFAULT 0,
  gateway_kind text NOT NULL,
  gateway_reference text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders owner or buyer read" ON public.orders FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR auth.uid() = buyer_user_id
  OR EXISTS(SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.user_id = auth.uid())
);
CREATE POLICY "orders public insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders owner update" ON public.orders FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS(SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS(SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.user_id = auth.uid())
);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seed default plans + gateways (idempotent) ============
INSERT INTO public.plans (name, slug, price_inr, duration_days, features, sort_order)
VALUES
  ('Trial', 'trial', 0, 5, '["1 website","Free subdomain","Basic templates"]'::jsonb, 0),
  ('Starter', 'starter', 299, 30, '["1 website","Free subdomain","All templates","WhatsApp widget"]'::jsonb, 1),
  ('Pro', 'pro', 3999, 365, '["3 websites","Custom domain","All templates","Ecom (50 products)","Priority support"]'::jsonb, 2),
  ('Business', 'business', 9999, 365, '["Unlimited websites","Custom domain","All templates","Ecom unlimited","24x7 support"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.payment_gateways (kind, display_name, description, requires_manual_verification, sort_order)
VALUES
  ('razorpay', 'Razorpay', 'Instant card / UPI / netbanking via Razorpay', false, 1),
  ('upi_qr', 'UPI QR (manual)', 'Scan QR & upload screenshot for admin verification', true, 2),
  ('crypto', 'Crypto (USDT / BTC)', 'Send to wallet & submit txn hash', true, 3),
  ('bank', 'Bank transfer', 'NEFT / IMPS with reference', true, 4),
  ('manual', 'Contact admin', 'Admin will contact you to arrange payment', true, 5)
ON CONFLICT DO NOTHING;
