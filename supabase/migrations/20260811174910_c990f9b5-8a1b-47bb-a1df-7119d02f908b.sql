CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_integrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_integrations TO authenticated;
GRANT ALL ON public.api_integrations TO service_role;

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_integrations readable by everyone"
  ON public.api_integrations FOR SELECT USING (true);

CREATE POLICY "api_integrations admin write"
  ON public.api_integrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER api_integrations_updated_at BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.api_integrations (provider, label, enabled, config) VALUES
  ('imagekit', 'ImageKit (Image CDN + Media Library)', true, jsonb_build_object(
     'endpoint', 'https://ik.imagekit.io/yevm9inmx',
     'publicKey', 'public_5uRmEXX0ZH7b1GDhRbTfdo/uUNM=',
     'imagekitId', 'yevm9inmx',
     'webProxy', true,
     'forceAll', true,
     'defaultQuality', 80,
     'defaultFormat', 'auto',
     'uploadFolder', 'sktechlab'
  )),
  ('pexels', 'Pexels (stock photo fallback)', true, '{}'::jsonb);