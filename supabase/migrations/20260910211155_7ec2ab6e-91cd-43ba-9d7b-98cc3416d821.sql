ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_from_name text,
  ADD COLUMN IF NOT EXISTS email_reply_to text,
  ADD COLUMN IF NOT EXISTS email_admin_recipient text,
  ADD COLUMN IF NOT EXISTS email_types jsonb NOT NULL DEFAULT '{}'::jsonb;