ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ecom_addon_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ecom_addon_price_inr integer NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS ecom_addon_billing text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS ecom_addon_label text NOT NULL DEFAULT 'Online Shop (+Shop)',
  ADD COLUMN IF NOT EXISTS ecom_addon_desc text,
  ADD COLUMN IF NOT EXISTS ecom_addon_product_limit integer NOT NULL DEFAULT 200;

ALTER TABLE public.builder_sessions
  ADD COLUMN IF NOT EXISTS wants_ecommerce boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ecom_addon_price_inr integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ecom_addon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ecom_addon_status text NOT NULL DEFAULT 'none';