
INSERT INTO public.service_plans (service_type, tier, name, tagline, price_inr, billing, features, highlighted, sort_order)
VALUES
  ('site_subscription', 'free', 'Free', 'Forever free — SKTECHLAB subdomain', 0, 'monthly',
   '["1 website","SKTECHLAB subdomain","Basic templates","SSL & hosting included"]'::jsonb, false, 1),
  ('site_subscription', 'pro', 'Pro', 'Custom domain + premium templates', 499, 'monthly',
   '["5 websites","Custom domain","All premium templates","Remove SKTECHLAB branding","Priority support"]'::jsonb, true, 2),
  ('site_subscription', 'business', 'Business', 'For agencies & growing brands', 1499, 'monthly',
   '["Unlimited websites","Custom domain + email","White-label editor","Team collaboration","Advanced analytics","Dedicated manager"]'::jsonb, false, 3);
