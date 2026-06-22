-- Automatically create a pending referral reward when a referred user's
-- first order is delivered. The referrer receives ₦500 credit (50000 kobo).
-- Reward is created as 'pending' — it becomes 'credited' when the customer
-- wallet feature credits it (Feature 4).

CREATE OR REPLACE FUNCTION award_referral_on_first_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_existing    UUID;
  v_delivery_count INTEGER;
BEGIN
  -- Only act on transitions to 'delivered'
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  -- Find the referrer for this customer
  SELECT referred_by INTO v_referrer_id
  FROM users
  WHERE id = NEW.customer_id AND referred_by IS NOT NULL;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotency: skip if a reward already exists for this referrer/referee pair
  SELECT id INTO v_existing
  FROM referral_rewards
  WHERE referrer_id = v_referrer_id AND referee_id = NEW.customer_id;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only reward on the referee's FIRST ever delivered order
  SELECT COUNT(*) INTO v_delivery_count
  FROM orders
  WHERE customer_id = NEW.customer_id
    AND status = 'delivered'
    AND id <> NEW.id;

  IF v_delivery_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Create pending reward for the referrer
  INSERT INTO referral_rewards (referrer_id, referee_id, reward_type, amount, status)
  VALUES (v_referrer_id, NEW.customer_id, 'credit', 50000, 'pending');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_referral_on_first_delivery ON orders;

CREATE TRIGGER trigger_award_referral_on_first_delivery
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_referral_on_first_delivery();
