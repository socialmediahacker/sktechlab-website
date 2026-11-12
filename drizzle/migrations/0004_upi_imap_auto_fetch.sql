ALTER TABLE public.upi_gateway_settings
  ADD COLUMN IF NOT EXISTS imap_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imap_host text DEFAULT 'imap.gmail.com',
  ADD COLUMN IF NOT EXISTS imap_port integer NOT NULL DEFAULT 993,
  ADD COLUMN IF NOT EXISTS imap_email text,
  ADD COLUMN IF NOT EXISTS imap_app_password text,
  ADD COLUMN IF NOT EXISTS imap_folder text NOT NULL DEFAULT 'INBOX',
  ADD COLUMN IF NOT EXISTS imap_last_uid bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imap_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS imap_last_error text,
  ADD COLUMN IF NOT EXISTS imap_last_ok_at timestamptz;