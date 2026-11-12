ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS pexels_enabled BOOLEAN NOT NULL DEFAULT false;