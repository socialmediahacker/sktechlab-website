
-- Map each category slug to a layout variant, and patch content_json.brand.layout on all editable demos.
WITH map(slug, layout, theme) AS (
  VALUES
    ('restaurant','editorial','dark'),
    ('cafe','editorial','dark'),
    ('catering','editorial','light'),
    ('hotel','editorial','dark'),
    ('boutique-hotel','boutique','light'),

    ('ecommerce','bento','light'),
    ('fashion','bento','light'),
    ('jewellery','bento','light'),
    ('boutique','bento','light'),
    ('kirana','bento','light'),
    ('pet','bento','light'),

    ('gym','neon','dark'),
    ('gym-trainer','neon','dark'),
    ('saas','neon','dark'),
    ('automotive','neon','dark'),
    ('digital-agency','neon','dark'),
    ('marketing-agency','neon','dark'),
    ('podcast','neon','dark'),
    ('music','neon','dark'),
    ('crane-service','neon','dark'),

    ('salon','boutique','light'),
    ('spa','boutique','light'),
    ('yoga','boutique','light'),
    ('wedding','boutique','light'),
    ('makeup','boutique','light'),
    ('photographer-wedding','boutique','light'),
    ('mehndi-art','boutique','light'),
    ('event-decorator','boutique','light'),
    ('event','boutique','light'),
    ('barber','boutique','light'),
    ('tattoo','boutique','dark'),
    ('astrologer','boutique','dark'),

    ('law','brutal','light'),
    ('finance','brutal','light'),
    ('consulting','brutal','light'),
    ('chartered-accountant','brutal','light'),
    ('construction','brutal','light'),
    ('packers-movers','brutal','light'),
    ('cleaning','brutal','light'),

    ('portfolio','cinematic','dark'),
    ('photography','cinematic','dark'),
    ('freelancer','cinematic','dark'),
    ('startup','cinematic','dark'),
    ('interior','cinematic','light'),
    ('travel','cinematic','light'),
    ('tour-operator','cinematic','light'),
    ('doctor','cinematic','light'),
    ('dentist','cinematic','light'),
    ('education','cinematic','light'),
    ('coaching-center','cinematic','light'),
    ('tutor','cinematic','light'),
    ('driving-school','cinematic','light'),
    ('real-estate','cinematic','dark'),
    ('business','cinematic','light'),
    ('blog','editorial','light'),
    ('ngo','cinematic','light')
)
UPDATE public.templates t
SET content_json = jsonb_set(
  jsonb_set(
    COALESCE(content_json, '{}'::jsonb),
    '{brand,layout}',
    to_jsonb(m.layout),
    true
  ),
  '{brand,theme}',
  to_jsonb(m.theme),
  true
)
FROM public.categories c, map m
WHERE t.category_id = c.id
  AND c.slug = m.slug
  AND t.is_editable_demo = true
  AND t.content_json IS NOT NULL;

-- Fallback: any remaining editable demos with no layout get 'cinematic'
UPDATE public.templates
SET content_json = jsonb_set(content_json, '{brand,layout}', '"cinematic"'::jsonb, true)
WHERE is_editable_demo = true
  AND content_json IS NOT NULL
  AND (content_json->'brand'->>'layout') IS NULL;
