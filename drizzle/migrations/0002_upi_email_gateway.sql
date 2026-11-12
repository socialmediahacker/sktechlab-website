CREATE TABLE public.upi_gateway_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  display_name text NOT NULL DEFAULT 'UPI (FamPay)',
  upi_id text,
  payee_name text,
  qr_url text,
  instructions text NOT NULL DEFAULT 'Pay the exact amount shown and wait for auto verification.',
  random_min numeric NOT NULL DEFAULT 0.01,
  random_max numeric NOT NULL DEFAULT 0.99,
  unique_amount_enabled boolean NOT NULL DEFAULT true,
  expiry_minutes integer NOT NULL DEFAULT 15,
  poll_seconds integer NOT NULL DEFAULT 5,
  auto_verify_enabled boolean NOT NULL DEFAULT true,
  manual_utr_enabled boolean NOT NULL DEFAULT true,
  auto_approve_manual boolean NOT NULL DEFAULT false,
  sender_allowlist text[] NOT NULL DEFAULT ARRAY['no-reply@famapp.in']::text[],
  webhook_secret text,
  notify_admin boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upi_gateway_settings_singleton CHECK (id = 1)
);

GRANT ALL ON public.upi_gateway_settings TO service_role;
ALTER TABLE public.upi_gateway_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upi settings admin read" ON public.upi_gateway_settings
  FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER upi_gateway_settings_updated_at
  BEFORE UPDATE ON public.upi_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.upi_gateway_settings (id) VALUES (1);

CREATE TABLE public.upi_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL DEFAULT 'builder',
  reference_id text,
  user_id uuid,
  customer_name text,
  customer_phone text,
  base_amount numeric NOT NULL,
  payable_amount numeric NOT NULL,
  note text,
  upi_id text,
  status text NOT NULL DEFAULT 'pending',
  utr text,
  matched_txn_id text,
  matched_source text,
  matched_at timestamptz,
  admin_note text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.upi_payment_intents TO service_role;
GRANT SELECT ON public.upi_payment_intents TO authenticated;
ALTER TABLE public.upi_payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upi intents owner read" ON public.upi_payment_intents
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'));

CREATE INDEX upi_payment_intents_status_idx ON public.upi_payment_intents (status, expires_at DESC);
CREATE INDEX upi_payment_intents_amount_idx ON public.upi_payment_intents (payable_amount, status);

CREATE TRIGGER upi_payment_intents_updated_at
  BEFORE UPDATE ON public.upi_payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.upi_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'webhook',
  from_email text,
  subject text,
  body text,
  amount numeric,
  txn_id text,
  matched_intent_id uuid REFERENCES public.upi_payment_intents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.upi_email_events TO service_role;
GRANT SELECT ON public.upi_email_events TO authenticated;
ALTER TABLE public.upi_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upi email events admin read" ON public.upi_email_events
  FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX upi_email_events_txn_idx ON public.upi_email_events (txn_id) WHERE txn_id IS NOT NULL;