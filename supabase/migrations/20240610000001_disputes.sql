-- Dispute management: customers file disputes, admins resolve them
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
CREATE TYPE dispute_type AS ENUM ('missing_item', 'damaged_item', 'wrong_delivery', 'late_delivery', 'rider_conduct', 'overcharge', 'other');

CREATE TABLE IF NOT EXISTS disputes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES auth.users(id),
  rider_id      UUID REFERENCES riders(id),
  type          dispute_type NOT NULL,
  description   TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status        dispute_status NOT NULL DEFAULT 'open',
  resolution    TEXT,
  resolved_by   UUID REFERENCES auth.users(id),
  refund_amount INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_disputes_order_id     ON disputes(order_id);
CREATE INDEX idx_disputes_customer_id  ON disputes(customer_id);
CREATE INDEX idx_disputes_status       ON disputes(status);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Customers can view and file their own disputes
CREATE POLICY "Customers can file and view their own disputes"
  ON disputes FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Admins can view and resolve all disputes
CREATE POLICY "Admins can manage all disputes"
  ON disputes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dispute_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status IN ('resolved', 'rejected') AND OLD.status NOT IN ('resolved', 'rejected') THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dispute_timestamp
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_dispute_timestamp();
