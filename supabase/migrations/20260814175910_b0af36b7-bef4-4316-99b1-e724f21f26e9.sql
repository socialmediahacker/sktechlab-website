ALTER TABLE public.bulk_image_runs
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'images',
  ADD COLUMN IF NOT EXISTS apply_images boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_text boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_style boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skip_customised boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.bulk_apply_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.bulk_image_runs(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulk_apply_snapshots_run_idx ON public.bulk_apply_snapshots(run_id);

GRANT SELECT ON public.bulk_apply_snapshots TO authenticated;
GRANT ALL ON public.bulk_apply_snapshots TO service_role;

ALTER TABLE public.bulk_apply_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read bulk apply snapshots"
  ON public.bulk_apply_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));