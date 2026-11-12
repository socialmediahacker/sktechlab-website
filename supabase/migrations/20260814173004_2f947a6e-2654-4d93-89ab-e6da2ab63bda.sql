CREATE TABLE public.category_blueprints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  category_slug text NOT NULL,
  name text NOT NULL,
  section_order text[] NOT NULL DEFAULT '{}',
  layout text NOT NULL DEFAULT 'cinematic',
  palette jsonb NOT NULL DEFAULT '{}'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{}'::jsonb,
  motion text NOT NULL DEFAULT 'medium',
  hero_style text,
  notes text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.category_blueprints TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_blueprints TO authenticated;
GRANT ALL ON public.category_blueprints TO service_role;

ALTER TABLE public.category_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active blueprints"
  ON public.category_blueprints FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage blueprints"
  ON public.category_blueprints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_category_blueprints_slug ON public.category_blueprints (category_slug);

CREATE TRIGGER update_category_blueprints_updated_at
  BEFORE UPDATE ON public.category_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bulk_image_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL DEFAULT 'all',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  total integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  replaced integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text,
  started_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_image_runs TO authenticated;
GRANT ALL ON public.bulk_image_runs TO service_role;

ALTER TABLE public.bulk_image_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage image runs"
  ON public.bulk_image_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_bulk_image_runs_updated_at
  BEFORE UPDATE ON public.bulk_image_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();