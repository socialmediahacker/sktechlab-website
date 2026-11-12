CREATE TABLE public.harvested_images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  category_slug text not null default '',
  url text not null,
  source_url text,
  source_domain text,
  width integer,
  height integer,
  hash text not null,
  section_key text not null default 'gallery',
  quality_score integer not null default 0,
  blocked boolean not null default false,
  used_count integer not null default 0,
  used_in jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
CREATE UNIQUE INDEX harvested_images_hash_key ON public.harvested_images(hash);
CREATE INDEX harvested_images_cat_idx ON public.harvested_images(category_slug, section_key, used_count);
CREATE INDEX harvested_images_domain_idx ON public.harvested_images(source_domain);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.harvested_images TO authenticated;
GRANT ALL ON public.harvested_images TO service_role;
ALTER TABLE public.harvested_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage harvested images" ON public.harvested_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.harvest_runs (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'category',
  category_id uuid references public.categories(id) on delete set null,
  keywords text not null default '',
  sites jsonb not null default '[]'::jsonb,
  total integer not null default 0,
  processed integer not null default 0,
  collected integer not null default 0,
  status text not null default 'running',
  error text,
  started_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.harvest_runs TO authenticated;
GRANT ALL ON public.harvest_runs TO service_role;
ALTER TABLE public.harvest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage harvest runs" ON public.harvest_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER harvest_runs_updated_at BEFORE UPDATE ON public.harvest_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();