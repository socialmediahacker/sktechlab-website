CREATE OR REPLACE FUNCTION app_private.protect_profile_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT app_private.has_role(auth.uid(), 'admin'::public.app_role)
     AND (
       NEW.active_plan IS DISTINCT FROM OLD.active_plan
       OR NEW.plan_tier IS DISTINCT FROM OLD.plan_tier
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     )
  THEN
    RAISE EXCEPTION 'Only an administrator can change website plan access';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.protect_profile_entitlements() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_profile_entitlements ON public.profiles;
CREATE TRIGGER protect_profile_entitlements
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION app_private.protect_profile_entitlements();