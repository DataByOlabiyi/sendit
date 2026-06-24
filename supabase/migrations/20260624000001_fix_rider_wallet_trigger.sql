-- platform_schema_v2 was recorded in migration history but rider_wallet was
-- never actually created in production. This migration creates the table and
-- all dependent objects idempotently, then fixes the trigger security context.

-- ─── rider_wallet table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rider_wallet (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id     UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  balance      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid   NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rider_id)
);

CREATE INDEX IF NOT EXISTS idx_rider_wallet_rider_id ON public.rider_wallet(rider_id);

ALTER TABLE public.rider_wallet ENABLE ROW LEVEL SECURITY;

-- ─── RLS policies ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rider_wallet'
      AND policyname = 'Riders can view own wallet'
  ) THEN
    CREATE POLICY "Riders can view own wallet"
      ON public.rider_wallet FOR SELECT
      USING (rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rider_wallet'
      AND policyname = 'Admins can view all wallets'
  ) THEN
    CREATE POLICY "Admins can view all wallets"
      ON public.rider_wallet FOR SELECT
      USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rider_wallet'
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

GRANT SELECT, INSERT ON public.rider_wallet TO authenticated;

-- ─── Trigger function — SECURITY DEFINER so it bypasses RLS ──────────────────
-- Without SECURITY DEFINER this runs as the calling user (authenticated role)
-- which has no INSERT policy on rider_wallet, causing every rider signup to fail.
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

-- Re-create trigger (DROP IF EXISTS + CREATE is idempotent)
DROP TRIGGER IF EXISTS on_rider_created ON public.riders;
CREATE TRIGGER on_rider_created
  AFTER INSERT ON public.riders
  FOR EACH ROW EXECUTE FUNCTION create_rider_wallet();
