ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS autopay_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autopay_provider text NOT NULL DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS manual_upi_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS crypto_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crypto_wallet_address text,
  ADD COLUMN IF NOT EXISTS crypto_network text,
  ADD COLUMN IF NOT EXISTS crypto_qr_url text;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  plan_name text,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_subscription_id text,
  provider_customer_id text,
  amount_inr numeric NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'pending_mandate',
  trial_ends_at timestamptz,
  next_charge_at timestamptz,
  last_charge_at timestamptz,
  last_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);