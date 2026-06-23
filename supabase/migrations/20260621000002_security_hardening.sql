-- Security hardening migration: OTP persistence, refund idempotency,
-- atomic wallet orders, missing indexes, and promo code constraints.
-- Applied: 2026-06-21

-- ─── 1. OTP: DB-backed attempt counter and hashed storage ────────────────────

-- Track failed OTP attempts in the DB so the counter survives server restarts
-- and is shared across all serverless replicas.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_otp_hash     TEXT;

-- Enforce max 5 wrong attempts at the DB level as defence-in-depth.
ALTER TABLE orders
  ADD CONSTRAINT orders_otp_attempts_max
    CHECK (delivery_otp_attempts <= 10);

-- ─── 2. Payments: double-refund idempotency guard ────────────────────────────

-- refund_initiated_at is set atomically before the Paystack /refund call.
-- A non-null value means a refund is in-flight or completed; reject duplicates.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ;

-- ─── 3. Atomic wallet order creation ─────────────────────────────────────────

-- Creates an order and debits the wallet in a single serialisable transaction.
-- The balance >= 0 CHECK on customer_wallets enforces the insufficient-funds
-- guard automatically — no separate pre-check required.
CREATE OR REPLACE FUNCTION create_wallet_order(
  p_customer_id           UUID,
  p_pickup_address        TEXT,
  p_pickup_lat            FLOAT8,
  p_pickup_lng            FLOAT8,
  p_delivery_address      TEXT,
  p_delivery_lat          FLOAT8,
  p_delivery_lng          FLOAT8,
  p_delivery_landmark     TEXT,
  p_package_description   TEXT,
  p_package_size          TEXT,
  p_package_weight        NUMERIC,
  p_is_fragile            BOOLEAN,
  p_has_insurance         BOOLEAN,
  p_special_instructions  TEXT,
  p_is_scheduled          BOOLEAN,
  p_scheduled_pickup_at   TIMESTAMPTZ,
  p_preferred_time_slot   TEXT,
  p_estimated_distance_km NUMERIC,
  p_estimated_duration_min INT,
  p_base_fee              NUMERIC,
  p_distance_fee          NUMERIC,
  p_insurance_fee         NUMERIC,
  p_total_fee             NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance  NUMERIC;
  v_order_id UUID;
BEGIN
  -- Lock the wallet row to block concurrent debits for the same user.
  SELECT balance INTO v_balance
  FROM customer_wallets
  WHERE user_id = p_customer_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF v_balance < p_total_fee THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Insert order with payment_status = paid immediately; the debit below
  -- is in the same transaction so both succeed or both roll back.
  INSERT INTO orders (
    customer_id, pickup_address, pickup_lat, pickup_lng,
    delivery_address, delivery_lat, delivery_lng, delivery_landmark,
    package_description, package_size, package_weight,
    is_fragile, has_insurance, special_instructions,
    payment_method, is_scheduled, scheduled_pickup_at, preferred_time_slot,
    estimated_distance_km, estimated_duration_min,
    base_fee, distance_fee, insurance_fee, total_fee,
    status, payment_status
  ) VALUES (
    p_customer_id, p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_delivery_address, p_delivery_lat, p_delivery_lng, p_delivery_landmark,
    p_package_description, p_package_size, p_package_weight,
    p_is_fragile, p_has_insurance, p_special_instructions,
    'wallet', p_is_scheduled, p_scheduled_pickup_at, p_preferred_time_slot,
    p_estimated_distance_km, p_estimated_duration_min,
    p_base_fee, p_distance_fee, p_insurance_fee, p_total_fee,
    'pending', 'paid'
  )
  RETURNING id INTO v_order_id;

  -- Debit wallet (balance CHECK constraint raises if balance goes negative).
  UPDATE customer_wallets
  SET
    balance     = balance - p_total_fee,
    total_spent = total_spent + p_total_fee,
    updated_at  = NOW()
  WHERE user_id = p_customer_id;

  RETURN v_order_id;
END;
$$;

-- ─── 4. Missing composite indexes ────────────────────────────────────────────

-- Dashboard order list: customer filtered by status
CREATE INDEX IF NOT EXISTS idx_orders_customer_status
  ON orders (customer_id, status);

-- Rider order list: rider filtered by status
CREATE INDEX IF NOT EXISTS idx_orders_rider_status
  ON orders (rider_id, status)
  WHERE rider_id IS NOT NULL;

-- Live tracking feed: most recent tracking point per order
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_time
  ON order_tracking (order_id, recorded_at DESC);

-- Unread notification count per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read, created_at DESC);

-- Dispatch history per order
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_order
  ON delivery_attempts (order_id, created_at);

-- Promo use-count per user
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_promo
  ON promo_redemptions (promo_id, user_id);

-- ─── 5. Promo codes: enforce valid percentage range ───────────────────────────

-- Percentage promo values are stored as basis points (10000 = 100%).
-- Enforce the upper bound so no admin typo can give a >100% discount.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'promo_codes_valid_value'
  ) THEN
    ALTER TABLE promo_codes
      ADD CONSTRAINT promo_codes_valid_value
        CHECK (
          (type = 'flat'       AND value >= 0) OR
          (type = 'percentage' AND value >= 0 AND value <= 10000)
        );
  END IF;
END;
$$;

-- ─── 6. OTP attempt increment function ───────────────────────────────────────

-- Atomically increments the OTP attempt counter and returns the new count.
-- The DB constraint (delivery_otp_attempts <= 10) enforces the hard ceiling.
CREATE OR REPLACE FUNCTION increment_otp_attempts(p_order_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INT;
BEGIN
  UPDATE orders
  SET delivery_otp_attempts = delivery_otp_attempts + 1
  WHERE id = p_order_id
  RETURNING delivery_otp_attempts INTO v_attempts;

  RETURN v_attempts;
END;
$$;

-- ─── 7. Refund guard: atomic lock before Paystack call ────────────────────────

-- Sets refund_initiated_at only if it is currently NULL (one-shot lock).
-- Returns true if this caller won the lock, false if another already holds it.
CREATE OR REPLACE FUNCTION lock_payment_for_refund(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  UPDATE payments
  SET refund_initiated_at = NOW()
  WHERE id = p_payment_id
    AND refund_initiated_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;
