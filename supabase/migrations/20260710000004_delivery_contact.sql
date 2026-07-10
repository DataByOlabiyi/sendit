-- The booking flow never collected who's actually receiving the package —
-- only addresses. Riders had no way to reach the recipient directly and the
-- delivery-verification OTP was (incorrectly) sent to the customer's own
-- phone instead of the recipient's. Add a dedicated delivery-side contact,
-- mirroring the contact_name/contact_phone pattern order_stops already has
-- for multi-stop drop points.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS delivery_contact_phone TEXT;

-- create_wallet_order must accept and persist the same two fields so wallet
-- orders aren't left without a recipient contact. New params default to NULL
-- so this can't break in the unlikely event of a stale concurrent caller.
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
  p_total_fee             NUMERIC,
  p_delivery_contact_name  TEXT DEFAULT NULL,
  p_delivery_contact_phone TEXT DEFAULT NULL
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
    delivery_contact_name, delivery_contact_phone,
    package_description, package_size, package_weight,
    is_fragile, has_insurance, special_instructions,
    payment_method, is_scheduled, scheduled_pickup_at, preferred_time_slot,
    estimated_distance_km, estimated_duration_min,
    base_fee, distance_fee, insurance_fee, total_fee,
    status, payment_status
  ) VALUES (
    p_customer_id, p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_delivery_address, p_delivery_lat, p_delivery_lng, p_delivery_landmark,
    p_delivery_contact_name, p_delivery_contact_phone,
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
