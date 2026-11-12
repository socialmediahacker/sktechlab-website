
-- 1. Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'change_request',
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user own tickets read" ON public.support_tickets FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "user update own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete tickets" ON public.support_tickets FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Trial + plan fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'trial';

-- Backfill existing users
UPDATE public.profiles SET trial_ends_at = created_at + interval '5 days' WHERE trial_ends_at IS NULL;

-- 3. Update new-user trigger to include 5-day trial + auto-admin for special email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, whatsapp_number, trial_ends_at, plan_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'whatsapp_number',
    now() + interval '5 days',
    'trial'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN NEW.email IN ('admin@sktechlab.com','sktechlab@admin.com') THEN 'admin'::app_role ELSE 'user'::app_role END);
  RETURN NEW;
END; $$;
