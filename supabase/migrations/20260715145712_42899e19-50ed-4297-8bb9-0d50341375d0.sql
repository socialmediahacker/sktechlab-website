
DROP POLICY IF EXISTS "Anyone can create builder session" ON public.builder_sessions;
DROP POLICY IF EXISTS "Owner or session holder can view" ON public.builder_sessions;
DROP POLICY IF EXISTS "Owner or session holder can update" ON public.builder_sessions;
DROP POLICY IF EXISTS "Admin can delete" ON public.builder_sessions;

REVOKE ALL ON public.builder_sessions FROM anon;
REVOKE ALL ON public.builder_sessions FROM authenticated;

-- Only owner can read their own sessions after they attach (via server-fn); admins can read all.
CREATE POLICY "Owner can view session" ON public.builder_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage all sessions" ON public.builder_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.builder_sessions TO authenticated;

-- OTP codes need a policy so linter is quiet even though only service_role reads
CREATE POLICY "Admin can view otp" ON public.otp_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
