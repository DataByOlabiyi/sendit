-- ============================================================
-- Multi-stop / multi-drop delivery
-- ============================================================
CREATE TABLE IF NOT EXISTS order_stops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sequence     INTEGER NOT NULL,
  address      TEXT NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  landmark     TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
  arrived_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, sequence)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_multi_stop BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE order_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view their order stops" ON order_stops
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "Riders view assigned order stops" ON order_stops
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE rider_id IN (
      SELECT id FROM riders WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins manage order stops" ON order_stops
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- B2B merchant API: webhook injection and API keys
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the actual key
  prefix       TEXT NOT NULL,         -- first 8 chars shown in UI e.g. "sdk_live"
  scopes       TEXT[] NOT NULL DEFAULT ARRAY['orders:create', 'orders:read'],
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all API keys" ON api_keys
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
