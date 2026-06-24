-- create_rider_wallet() runs as SECURITY INVOKER by default, meaning it
-- executes with the privileges of the calling user. Since rider_wallet has
-- RLS enabled and no INSERT policy, the trigger fails for non-admin callers.
-- Adding SECURITY DEFINER makes it run as the function owner (postgres/admin),
-- which bypasses RLS for this specific auto-create operation.
CREATE OR REPLACE FUNCTION create_rider_wallet()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.rider_wallet (rider_id) VALUES (NEW.id)
  ON CONFLICT (rider_id) DO NOTHING;
  RETURN NEW;
END;
$$;
