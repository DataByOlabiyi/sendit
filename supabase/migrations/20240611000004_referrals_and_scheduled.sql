-- ============================================================
-- Referral system
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by     UUID REFERENCES auth.users(id);

-- Auto-generate a referral code for new users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();

CREATE TABLE IF NOT EXISTS referral_rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referee_id  UUID NOT NULL REFERENCES auth.users(id),
  reward_type TEXT NOT NULL DEFAULT 'credit',   -- 'credit' | 'promo'
  amount      INTEGER,                           -- in kobo, for credit rewards
  promo_id    UUID REFERENCES promo_codes(id),  -- for promo rewards
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_id, referee_id)
);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referral rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "Admins manage referral rewards" ON referral_rewards
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- Scheduled deliveries (scheduled_pickup_at already exists on orders)
-- Add a time slot preference column
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_scheduled       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preferred_time_slot TEXT;  -- 'morning' | 'afternoon' | 'evening' | 'asap'
