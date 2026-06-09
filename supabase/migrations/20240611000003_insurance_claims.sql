-- Delivery insurance claims
CREATE TYPE claim_status AS ENUM ('pending', 'under_review', 'approved', 'paid', 'rejected');

CREATE TABLE IF NOT EXISTS insurance_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES auth.users(id),
  claim_amount  INTEGER NOT NULL,    -- in kobo
  description   TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status        claim_status NOT NULL DEFAULT 'pending',
  payout_amount INTEGER,
  resolved_by   UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  UNIQUE (order_id)  -- one claim per order
);

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own claims" ON insurance_claims
  FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins manage all claims" ON insurance_claims
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
