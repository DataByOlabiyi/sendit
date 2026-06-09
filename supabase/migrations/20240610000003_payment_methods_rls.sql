-- Ensure payment_methods table has RLS enabled.
-- The paystack_authorization_code column is sensitive — never expose via client queries.
ALTER TABLE IF EXISTS payment_methods ENABLE ROW LEVEL SECURITY;

-- Strip the authorization code from client-visible SELECT
-- by creating a security-definer view that excludes it.
CREATE OR REPLACE VIEW customer_payment_methods AS
  SELECT id, user_id, type, label, last_four, bank_name, is_default, created_at
  FROM payment_methods;

-- Users can see their own cards (without the auth code)
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
CREATE POLICY "Users can view their own payment methods"
  ON payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own cards
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;
CREATE POLICY "Users can delete their own payment methods"
  ON payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- Only service role can INSERT/UPDATE (via webhook handler)
-- No client INSERT policy = auth codes are write-protected from clients
