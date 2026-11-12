
-- 1. Extend templates
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS is_editable_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archetype text,
  ADD COLUMN IF NOT EXISTS content_json jsonb;

CREATE INDEX IF NOT EXISTS templates_editable_demo_idx
  ON public.templates (is_editable_demo) WHERE is_editable_demo = true;
CREATE INDEX IF NOT EXISTS templates_show_on_home_idx
  ON public.templates (show_on_home) WHERE show_on_home = true;
CREATE INDEX IF NOT EXISTS templates_archetype_idx ON public.templates (archetype);

-- 2. Extend sites with its own content copy
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS content_json jsonb;

-- 3. Contact submissions from demo/live sites
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  message text,
  source text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT INSERT ON public.contact_submissions TO anon;
GRANT ALL ON public.contact_submissions TO service_role;

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can submit a lead from a public site
CREATE POLICY "Anyone can submit a lead"
  ON public.contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Site owner reads their leads
CREATE POLICY "Owners view their site leads"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (
    site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = contact_submissions.site_id AND s.user_id = auth.uid()
    )
  );

-- Admins read all
CREATE POLICY "Admins view all leads"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage leads"
  ON public.contact_submissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS contact_submissions_site_idx ON public.contact_submissions (site_id, created_at DESC);
