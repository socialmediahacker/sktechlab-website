CREATE TABLE public.niche_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  input_hash text NOT NULL UNIQUE,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.niche_profiles TO authenticated;
GRANT ALL ON public.niche_profiles TO service_role;
ALTER TABLE public.niche_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view niche profiles" ON public.niche_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER niche_profiles_updated_at BEFORE UPDATE ON public.niche_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();