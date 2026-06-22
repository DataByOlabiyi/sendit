-- Customer wallet: balance, top-up credits, and wallet-based order payment.
-- Follows the same pattern as rider_wallets.

CREATE TABLE customer_wallets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_credited NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent   NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_own_wallet"
  ON customer_wallets FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "admin_all_wallets"
  ON customer_wallets FOR ALL
  USING (is_admin());

-- Track Paystack top-up references for idempotency
CREATE TABLE wallet_topups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paystack_reference  TEXT UNIQUE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_own_topups"
  ON wallet_topups FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "admin_all_topups"
  ON wallet_topups FOR ALL
  USING (is_admin());

-- Auto-create wallet when a customer row is inserted into users
CREATE OR REPLACE FUNCTION create_customer_wallet_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    INSERT INTO customer_wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_customer_wallet
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_wallet_fn();

-- Credit wallet balance when admin marks a referral reward as 'credited'
CREATE OR REPLACE FUNCTION credit_customer_wallet_on_referral_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC(12,2);
BEGIN
  -- amount in kobo → NGN
  v_amount := (NEW.amount::NUMERIC) / 100.0;

  UPDATE customer_wallets
  SET
    balance        = balance + v_amount,
    total_credited = total_credited + v_amount,
    updated_at     = NOW()
  WHERE user_id = NEW.referrer_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_credit_wallet_on_referral
  AFTER UPDATE OF status ON referral_rewards
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'credited' AND NEW.status = 'credited')
  EXECUTE FUNCTION credit_customer_wallet_on_referral_fn();

-- Atomic wallet credit (called from wallet/verify API route)
CREATE OR REPLACE FUNCTION credit_customer_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_wallets
  SET
    balance        = balance + p_amount,
    total_credited = total_credited + p_amount,
    updated_at     = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Atomic wallet debit (called from order creation with wallet payment)
CREATE OR REPLACE FUNCTION debit_customer_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_wallets
  SET
    balance     = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at  = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Balance CHECK constraint enforces >= 0; this handles the insufficient-funds case.
END;
$$;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION update_customer_wallet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trigger_customer_wallet_updated_at
  BEFORE UPDATE ON customer_wallets
  FOR EACH ROW EXECUTE FUNCTION update_customer_wallet_updated_at();
