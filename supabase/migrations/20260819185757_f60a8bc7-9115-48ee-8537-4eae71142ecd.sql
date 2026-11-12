CREATE TABLE public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  prompt text not null,
  scope jsonb not null default '{}'::jsonb,
  proposals jsonb not null default '[]'::jsonb,
  snapshots jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
GRANT SELECT ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read ai runs" ON public.ai_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));