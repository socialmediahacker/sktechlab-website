ALTER TABLE public.harvested_images
  ADD COLUMN IF NOT EXISTS cdn_url text,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS upload_error text;

CREATE INDEX IF NOT EXISTS harvested_images_pending_upload_idx
  ON public.harvested_images (created_at)
  WHERE cdn_url IS NULL AND blocked = false;

CREATE INDEX IF NOT EXISTS harvested_images_cat_section_idx
  ON public.harvested_images (category_slug, section_key, used_count);