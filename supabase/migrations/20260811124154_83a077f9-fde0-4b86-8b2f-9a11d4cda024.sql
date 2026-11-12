CREATE TABLE public.store_payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL UNIQUE REFERENCES public.sites(id) ON DELETE CASCADE,
  cod_enabled boolean NOT NULL DEFAULT true,
  cod_min_inr numeric NOT NULL DEFAULT 0,
  cod_max_inr numeric,
  cod_instructions text,
  upi_enabled boolean NOT NULL DEFAULT false,
  upi_id text,
  upi_name text,
  upi_qr_url text,
  upi_instructions text,
  bank_enabled boolean NOT NULL DEFAULT false,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  bank_instructions text,
  crypto_enabled boolean NOT NULL DEFAULT false,
  crypto_wallet_address text,
  crypto_network text,
  crypto_qr_url text,
  crypto_instructions text,
  razorpay_enabled boolean NOT NULL DEFAULT false,
  razorpay_key_id text,
  razorpay_key_secret text,
  razorpay_mode text NOT NULL DEFAULT 'test',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_payment_settings TO authenticated;
GRANT ALL ON public.store_payment_settings TO service_role;

ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins manage store payment settings"
ON public.store_payment_settings FOR ALL TO authenticated
USING (public.can_edit_site(site_id))
WITH CHECK (public.can_edit_site(site_id));

CREATE TRIGGER store_payment_settings_updated_at
BEFORE UPDATE ON public.store_payment_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid,
  ADD COLUMN IF NOT EXISTS payment_rejected_reason text;