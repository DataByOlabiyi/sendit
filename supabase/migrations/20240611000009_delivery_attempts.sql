CREATE TABLE IF NOT EXISTS delivery_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id        UUID REFERENCES riders(id),
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome         TEXT NOT NULL
    CHECK (outcome IN ('success', 'failed', 'no_answer', 'wrong_address', 'refused')),
  notes           TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_attempts_order_id_idx ON delivery_attempts(order_id);

ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view their order attempts" ON delivery_attempts
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "Riders view assigned order attempts" ON delivery_attempts
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE rider_id IN (
      SELECT id FROM riders WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Riders insert their own attempts" ON delivery_attempts
  FOR INSERT WITH CHECK (
    rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage delivery attempts" ON delivery_attempts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
