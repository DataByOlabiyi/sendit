-- custom_access_token_hook: embeds user_role into the JWT on every sign-in.
-- This allows middleware to read the role from the token payload instead of
-- making a DB round-trip on every request.
--
-- After running this migration, register the hook in Supabase Dashboard:
--   Authentication → Hooks → custom_access_token_hook
--   Function: public.custom_access_token_hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims  jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
