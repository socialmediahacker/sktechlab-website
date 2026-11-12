CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  page_url text,
  expected text,
  actual text,
  steps text,
  device text NOT NULL DEFAULT 'both',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_text text NOT NULL DEFAULT '',
  admin_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports admin select" ON public.bug_reports
  FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "bug_reports admin insert" ON public.bug_reports
  FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "bug_reports admin update" ON public.bug_reports
  FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "bug_reports admin delete" ON public.bug_reports
  FOR DELETE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bug_reports_updated_at BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX bug_reports_created_at_idx ON public.bug_reports (created_at DESC);