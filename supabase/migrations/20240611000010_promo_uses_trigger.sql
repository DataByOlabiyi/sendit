-- Atomically increment promo_codes.uses_count whenever a redemption is recorded.
-- This avoids a read-modify-write race in application code.
CREATE OR REPLACE FUNCTION increment_promo_uses()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = NEW.promo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER promo_redemption_increment
AFTER INSERT ON promo_redemptions
FOR EACH ROW EXECUTE FUNCTION increment_promo_uses();
