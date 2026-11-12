CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  language text NOT NULL DEFAULT 'English',
  intent text NOT NULL DEFAULT 'seo',
  category_slug text,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS seo_keywords_uniq ON public.seo_keywords (lower(keyword), language);
CREATE INDEX IF NOT EXISTS seo_keywords_cat ON public.seo_keywords (category_slug, intent, used_count);
GRANT SELECT ON public.seo_keywords TO anon, authenticated;
GRANT ALL ON public.seo_keywords TO service_role;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "keywords readable" ON public.seo_keywords FOR SELECT USING (true);
CREATE POLICY "keywords admin write" ON public.seo_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_title text,
  meta_description text,
  excerpt text,
  body text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  category_slug text,
  keywords text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'English',
  hero_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer_block text,
  word_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  views integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_posts_status ON public.blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_cat ON public.blog_posts (category_slug);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published blogs readable" ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "blogs admin all" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.blog_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'all',
  category_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  per_category integer NOT NULL DEFAULT 1,
  min_words integer NOT NULL DEFAULT 500,
  max_words integer NOT NULL DEFAULT 1200,
  language text NOT NULL DEFAULT 'English',
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_runs TO authenticated;
GRANT ALL ON public.blog_runs TO service_role;
ALTER TABLE public.blog_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog runs admin" ON public.blog_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));