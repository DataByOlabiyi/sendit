-- Two fixes for the rider onboarding INSERT failure:
--
-- 1. SECURITY DEFINER on create_rider_wallet()
--    The trigger is SECURITY INVOKER by default, so it runs as the calling
--    user. That user has no INSERT policy on rider_wallet → RLS blocks the
--    trigger → whole riders INSERT rolls back. SECURITY DEFINER makes the
--    trigger run as the function owner (postgres) which bypasses RLS.
--
-- 2. INSERT policy on rider_wallet
--    Belt-and-suspenders: even without SECURITY DEFINER, an authenticated
--    rider should be able to create their own wallet row (the trigger does
--    this implicitly; the policy makes it explicit).

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

-- Allow authenticated users (and the trigger) to create their own wallet row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'rider_wallet'
      AND policyname = 'Riders can insert own wallet'
  ) THEN
    CREATE POLICY "Riders can insert own wallet"
      ON public.rider_wallet FOR INSERT
      WITH CHECK (
        rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- Grant table-level INSERT to authenticated so the policy can take effect.
GRANT INSERT ON public.rider_wallet TO authenticated;
