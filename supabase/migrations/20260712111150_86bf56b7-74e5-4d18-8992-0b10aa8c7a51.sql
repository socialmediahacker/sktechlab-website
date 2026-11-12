DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'domain_requests'
      AND constraint_name = 'domain_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.domain_requests
      ADD CONSTRAINT domain_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'support_tickets'
      AND constraint_name = 'support_tickets_user_id_fkey'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'sites'
      AND constraint_name = 'sites_user_id_fkey'
  ) THEN
    ALTER TABLE public.sites
      ADD CONSTRAINT sites_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'sites'
      AND constraint_name = 'sites_template_id_fkey'
  ) THEN
    ALTER TABLE public.sites
      ADD CONSTRAINT sites_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'templates'
      AND constraint_name = 'templates_category_id_fkey'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'templates'
      AND constraint_name = 'templates_subcategory_id_fkey'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_subcategory_id_fkey
      FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'user_roles'
      AND constraint_name = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IN (
  'admin@sktechlab.com',
  'sktechlab@admin.com',
  'socialmediahackerweb@gmail.com',
  'yirega4199@epaynine.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

DROP POLICY IF EXISTS "Admin selects all sites" ON public.sites;
CREATE POLICY "Admin selects all sites" ON public.sites
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin updates all sites" ON public.sites;
CREATE POLICY "Admin updates all sites" ON public.sites
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin deletes all sites" ON public.sites;
CREATE POLICY "Admin deletes all sites" ON public.sites
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

WITH demo_pool AS (
  SELECT * FROM (VALUES
    (1, 'https://ops.vq.pe/', 'Business Operations'),
    (2, 'https://restrofine.vq.pe/', 'Restaurant Pro'),
    (3, 'https://gymfit.vq.pe/', 'Fitness Studio'),
    (4, 'https://makeover.vq.pe/', 'Salon Makeover'),
    (5, 'https://shopswalk.vq.pe/', 'Shop Walk'),
    (6, 'https://glamstoriesbygunjan.vq.pe/', 'Glam Stories'),
    (7, 'https://gypsy-rally.vq.pe/', 'Travel Rally'),
    (8, 'https://riyafashionstore.vq.pe/', 'Riya Fashion'),
    (9, 'https://mvinvestments.vq.pe/', 'MV Investments'),
    (10, 'https://digiency.vq.pe/', 'Digital Agency'),
    (11, 'https://assigngpt.vq.pe/', 'SaaS Launch'),
    (12, 'https://baker.vq.pe/', 'Cafe Baker'),
    (13, 'http://mentoringmindssolution.vq.pe/', 'Mentoring Minds'),
    (14, 'https://elizamakeover.vq.pe/', 'Eliza Makeover'),
    (15, 'https://global-nationopenuniversity.vq.pe/', 'Global University')
  ) AS v(ord, url, label)
), ranked_templates AS (
  SELECT t.id, t.name, t.thumbnail_url, c.slug AS category_slug,
         row_number() OVER (ORDER BY t.sort_order, t.created_at, t.id) AS rn
  FROM public.templates t
  JOIN public.categories c ON c.id = t.category_id
  WHERE t.demo_url = 'https://digiency.vq.pe'
     OR t.demo_url = 'https://digiency.vq.pe/'
     OR t.thumbnail_url = 'https://vq.pe/thumb/digiency.jpg'
), mapped AS (
  SELECT rt.id, dp.url,
         'https://s.wordpress.com/mshots/v1/' || replace(dp.url, '/', '%2F') || '?w=800' AS thumb
  FROM ranked_templates rt
  JOIN demo_pool dp ON dp.ord = ((rt.rn - 1) % 15) + 1
)
UPDATE public.templates t
SET demo_url = mapped.url,
    thumbnail_url = mapped.thumb,
    accent_color = COALESCE(t.accent_color, '#059669')
FROM mapped
WHERE t.id = mapped.id;

UPDATE public.templates t
SET thumbnail_url = 'https://s.wordpress.com/mshots/v1/' || replace(t.demo_url, '/', '%2F') || '?w=800'
WHERE t.demo_url IS NOT NULL
  AND (t.thumbnail_url IS NULL OR t.thumbnail_url LIKE 'https://vq.pe/thumb/%' OR t.thumbnail_url LIKE 'https://vq.pe/owner/%');