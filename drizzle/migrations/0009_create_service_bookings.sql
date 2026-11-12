CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  website_url text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.service_bookings TO authenticated;
GRANT ALL ON public.service_bookings TO service_role;

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view service bookings"
ON public.service_bookings FOR SELECT TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service bookings"
ON public.service_bookings FOR UPDATE TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service bookings"
ON public.service_bookings FOR DELETE TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'));

CREATE INDEX service_bookings_created_at_idx ON public.service_bookings (created_at DESC);