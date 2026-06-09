-- ============================================================
-- Promo codes system
-- ============================================================
CREATE TYPE promo_type AS ENUM ('percentage', 'flat');
CREATE TYPE promo_scope AS ENUM ('all_users', 'new_users', 'single_user');

CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  type            promo_type NOT NULL DEFAULT 'flat',
  scope           promo_scope NOT NULL DEFAULT 'all_users',
  value           INTEGER NOT NULL,             -- kobo (flat) or basis points (percentage × 100)
  max_uses        INTEGER,                       -- NULL = unlimited
  uses_count      INTEGER NOT NULL DEFAULT 0,
  min_order_value INTEGER NOT NULL DEFAULT 0,   -- minimum order total in kobo
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  target_user_id  UUID REFERENCES auth.users(id),  -- for single_user scope
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code     ON promo_codes(code);
CREATE INDEX idx_promo_codes_active   ON promo_codes(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id     UUID NOT NULL REFERENCES promo_codes(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  order_id     UUID NOT NULL REFERENCES orders(id),
  discount_amount INTEGER NOT NULL,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (promo_id, order_id)
);

CREATE INDEX idx_promo_redemptions_user ON promo_redemptions(user_id);

ALTER TABLE promo_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Admins manage promos; customers can read active promos to validate
CREATE POLICY "Admins manage promo codes" ON promo_codes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Customers can read active promos" ON promo_codes FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');
CREATE POLICY "Users view own redemptions" ON promo_redemptions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- Rider performance tiers
-- ============================================================
ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Tier upgrade function: called by trigger on total_deliveries update
CREATE OR REPLACE FUNCTION update_rider_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.total_deliveries >= 500 AND NEW.rating >= 4.7 THEN 'platinum'
    WHEN NEW.total_deliveries >= 200 AND NEW.rating >= 4.5 THEN 'gold'
    WHEN NEW.total_deliveries >= 50  AND NEW.rating >= 4.0 THEN 'silver'
    ELSE 'bronze'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rider_tier
  BEFORE UPDATE OF total_deliveries, rating ON riders
  FOR EACH ROW EXECUTE FUNCTION update_rider_tier();
