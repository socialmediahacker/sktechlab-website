
-- Builder wizard sessions
CREATE TABLE public.builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  business_name text NOT NULL,
  business_category text,
  description text,
  whatsapp text,
  whatsapp_verified boolean NOT NULL DEFAULT false,
  selected_template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  ai_generated_content jsonb,
  candidate_template_ids uuid[],
  selected_domain text,
  domain_type text CHECK (domain_type IN ('free_subdomain','paid_suggested','byo')),
  selected_plan_id uuid REFERENCES public.service_plans(id) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','manual_invoice','paid','failed')),
  payment_method text,
  payment_ref text,
  current_step text NOT NULL DEFAULT 'details',
  completed boolean NOT NULL DEFAULT false,
  created_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.builder_sessions TO anon;
GRANT ALL ON public.builder_sessions TO service_role;
ALTER TABLE public.builder_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create/update a session by its id (unauth wizard start)
CREATE POLICY "Anyone can create builder session" ON public.builder_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owner or session holder can view" ON public.builder_sessions FOR SELECT TO anon, authenticated USING (
  user_id IS NULL OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Owner or session holder can update" ON public.builder_sessions FOR UPDATE TO anon, authenticated USING (
  user_id IS NULL OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admin can delete" ON public.builder_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_builder_sessions_updated BEFORE UPDATE ON public.builder_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OTP codes
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.otp_codes TO service_role;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- Only service_role touches this table (via server functions).

-- Domain-request add is_paid_suggestion
ALTER TABLE public.domain_requests ADD COLUMN IF NOT EXISTS is_paid_suggestion boolean DEFAULT false;
ALTER TABLE public.domain_requests ADD COLUMN IF NOT EXISTS builder_session_id uuid REFERENCES public.builder_sessions(id) ON DELETE SET NULL;

-- Site settings toggles
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ai_generation_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS razorpay_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_otp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS free_subdomain_root text NOT NULL DEFAULT 'sktechlab.site';
