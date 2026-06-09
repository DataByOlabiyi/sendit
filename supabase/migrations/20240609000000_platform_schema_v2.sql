-- ---------------------------------------------------------------------------
-- Platform Schema v2
-- Covers:
--   1.  payments.platform_fee / rider_payout — fix schema drift
--   2.  order_status enum — add failed_delivery, return_in_progress, returned
--   3.  orders.cancelled_by — distinguish customer / rider / admin cancellation
--   4.  orders.assigned_at — measure time from payment to rider assignment
--   5.  orders.scheduled_pickup_at — support scheduled deliveries (future)
--   6.  riders.bank_account_name/number/bank_code — payout capture
--   7.  rider_wallet table — running balance per rider
--   8.  rider_payouts table — payout batch records
--   9.  admin_audit_log table — immutable record of every admin action
--  10.  order_tracking TTL policy — delete rows older than 90 days
--  11.  order_timeout_minutes in platform_config
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. payments — add platform_fee and rider_payout columns
--    Back-fill existing paid rows using the platform_commission config value.
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rider_payout  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Back-fill: platform_fee = 15% of amount, rider_payout = 85% of amount
UPDATE public.payments
SET
  platform_fee = ROUND(amount * 0.15, 2),
  rider_payout  = ROUND(amount * 0.85, 2)
WHERE platform_fee = 0;

-- Trigger to auto-compute these columns on new payments
CREATE OR REPLACE FUNCTION compute_payment_splits()
RETURNS TRIGGER AS $$
DECLARE
  commission NUMERIC;
BEGIN
  -- Read live commission from platform_config; fall back to 15 %
  SELECT COALESCE(value::NUMERIC, 0.15) INTO commission
  FROM public.platform_config
  WHERE key = 'platform_commission'
  LIMIT 1;

  NEW.platform_fee := ROUND(NEW.amount * commission, 2);
  NEW.rider_payout  := NEW.amount - NEW.platform_fee;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_payment_splits
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION compute_payment_splits();


-- ---------------------------------------------------------------------------
-- 2. order_status enum — new terminal/intermediate states
--    failed_delivery   : rider arrived but could not complete delivery
--    return_in_progress: rider is returning the package to sender
--    returned          : package handed back to sender
-- ---------------------------------------------------------------------------
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed_delivery'    AFTER 'in_transit';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_in_progress' AFTER 'failed_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned'           AFTER 'return_in_progress';


-- ---------------------------------------------------------------------------
-- 3. orders — additional operational columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_by       TEXT CHECK (cancelled_by IN ('customer', 'rider', 'admin', 'system')),
  ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason     TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_otp       TEXT,
  ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMPTZ;

-- Extend the status-timestamp trigger for new states
CREATE OR REPLACE FUNCTION update_order_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    CASE NEW.status
      WHEN 'accepted'          THEN NEW.accepted_at    = NOW();
      WHEN 'picked_up'         THEN NEW.picked_up_at   = NOW();
      WHEN 'in_transit'        THEN NEW.in_transit_at  = NOW();
      WHEN 'delivered'         THEN NEW.delivered_at   = NOW();
      WHEN 'cancelled'         THEN NEW.cancelled_at   = NOW();
      WHEN 'failed_delivery'   THEN NEW.failed_at      = NOW();
      WHEN 'returned'          THEN NEW.returned_at    = NOW();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update state machine to include new valid transitions
CREATE OR REPLACE FUNCTION enforce_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending'           AND NEW.status IN ('accepted', 'cancelled')) OR
    (OLD.status = 'accepted'          AND NEW.status IN ('picked_up', 'cancelled')) OR
    (OLD.status = 'picked_up'         AND NEW.status IN ('in_transit', 'cancelled')) OR
    (OLD.status = 'in_transit'        AND NEW.status IN ('delivered', 'failed_delivery', 'cancelled')) OR
    (OLD.status = 'failed_delivery'   AND NEW.status IN ('return_in_progress', 'in_transit')) OR
    (OLD.status = 'return_in_progress' AND NEW.status = 'returned') OR
    -- Terminal states: no further transitions
    (OLD.status IN ('delivered', 'returned', 'cancelled') AND NEW.status = OLD.status)
  ) THEN
    RAISE EXCEPTION
      'Invalid order status transition: % → %.',
      OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ---------------------------------------------------------------------------
-- 4. riders — bank account for payouts (captured at onboarding)
-- ---------------------------------------------------------------------------
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS bank_account_name   TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_code           TEXT,
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT; -- Paystack Transfer Recipient code


-- ---------------------------------------------------------------------------
-- 5. rider_wallet — running balance per rider
-- ---------------------------------------------------------------------------
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

CREATE POLICY "Riders can view own wallet"
  ON public.rider_wallet FOR SELECT
  USING (
    rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all wallets"
  ON public.rider_wallet FOR SELECT
  USING (is_admin());

-- Auto-create wallet row when rider is created
CREATE OR REPLACE FUNCTION create_rider_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.rider_wallet (rider_id) VALUES (NEW.id)
  ON CONFLICT (rider_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_rider_created
  AFTER INSERT ON public.riders
  FOR EACH ROW EXECUTE FUNCTION create_rider_wallet();

-- Credit wallet on order delivery
CREATE OR REPLACE FUNCTION credit_rider_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.rider_id IS NOT NULL
  THEN
    UPDATE public.rider_wallet
    SET
      balance      = balance + (
        SELECT COALESCE(rider_payout, 0)
        FROM public.payments
        WHERE order_id = NEW.id AND status = 'paid'
        LIMIT 1
      ),
      total_earned = total_earned + (
        SELECT COALESCE(rider_payout, 0)
        FROM public.payments
        WHERE order_id = NEW.id AND status = 'paid'
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE rider_id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_order_delivered_credit_wallet
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION credit_rider_wallet();


-- ---------------------------------------------------------------------------
-- 6. rider_payouts — payout batch records (admin-initiated)
-- ---------------------------------------------------------------------------
CREATE TYPE IF NOT EXISTS public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS public.rider_payouts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id             UUID NOT NULL REFERENCES public.riders(id),
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status               public.payout_status NOT NULL DEFAULT 'pending',
  paystack_transfer_code TEXT,
  paystack_reference   TEXT UNIQUE,
  initiated_by         UUID REFERENCES public.users(id),
  failure_reason       TEXT,
  initiated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_payouts_rider_id ON public.rider_payouts(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_payouts_status   ON public.rider_payouts(status);

ALTER TABLE public.rider_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view own payouts"
  ON public.rider_payouts FOR SELECT
  USING (
    rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all payouts"
  ON public.rider_payouts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER update_rider_payouts_updated_at
  BEFORE UPDATE ON public.rider_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Debit wallet when payout is initiated
CREATE OR REPLACE FUNCTION debit_rider_wallet_on_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'processing' AND OLD.status = 'pending' THEN
    UPDATE public.rider_wallet
    SET
      balance    = balance - NEW.amount,
      total_paid = total_paid + NEW.amount,
      updated_at = NOW()
    WHERE rider_id = NEW.rider_id
      AND balance  >= NEW.amount;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient wallet balance for payout';
    END IF;
  END IF;

  -- If payout fails, refund the balance
  IF NEW.status = 'failed' AND OLD.status = 'processing' THEN
    UPDATE public.rider_wallet
    SET
      balance    = balance + NEW.amount,
      total_paid = total_paid - NEW.amount,
      updated_at = NOW()
    WHERE rider_id = NEW.rider_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_payout_status_change
  BEFORE UPDATE ON public.rider_payouts
  FOR EACH ROW EXECUTE FUNCTION debit_rider_wallet_on_payout();


-- ---------------------------------------------------------------------------
-- 7. admin_audit_log — immutable record of every significant admin action
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.users(id),
  action      TEXT NOT NULL,        -- e.g. 'rider.approve', 'order.force_cancel', 'pricing.update'
  target_type TEXT,                 -- e.g. 'rider', 'order', 'user', 'platform_config'
  target_id   TEXT,                 -- UUID or key of the affected record
  before_data JSONB,                -- snapshot before the change
  after_data  JSONB,                -- snapshot after the change
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor     ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target    ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action    ON public.admin_audit_log(action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log; no one can modify it through RLS
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (is_admin());

-- Inserts happen via service-role (admin server actions) — RLS blocks direct client writes
CREATE POLICY "Service role inserts audit entries"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- 8. order_tracking TTL — delete tracking rows older than 90 days
--    Run via a pg_cron job or Supabase scheduled Edge Function.
--    The function itself is registered here; scheduling is external.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_order_tracking()
RETURNS void AS $$
BEGIN
  DELETE FROM public.order_tracking
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ---------------------------------------------------------------------------
-- 9. platform_config — add order timeout setting
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_config (key, value, description) VALUES
  ('order_timeout_minutes', '15', 'Minutes after payment before an unaccepted order is auto-cancelled'),
  ('surge_multiplier',      '1.5', 'Fare multiplier applied during peak hours'),
  ('surge_enabled',         'false', 'Whether peak-hour surge pricing is active')
ON CONFLICT (key) DO NOTHING;
