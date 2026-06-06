-- ---------------------------------------------------------------------------
-- UI Features: order references, rider documents, platform config
-- ---------------------------------------------------------------------------

-- --- Order reference ---------------------------------------------------------
-- Human-readable reference: SDT-YYMMDD-NNNNN (e.g. SDT-260606-00042)

CREATE SEQUENCE IF NOT EXISTS order_reference_seq START 1;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE;

CREATE OR REPLACE FUNCTION generate_order_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reference = 'SDT-' ||
    TO_CHAR(NOW(), 'YYMMDD') || '-' ||
    LPAD(NEXTVAL('order_reference_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_reference
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.reference IS NULL)
  EXECUTE FUNCTION generate_order_reference();

-- Back-fill existing orders that have no reference yet
UPDATE orders
SET reference = 'SDT-' ||
  TO_CHAR(created_at, 'YYMMDD') || '-' ||
  LPAD(NEXTVAL('order_reference_seq')::TEXT, 5, '0')
WHERE reference IS NULL;

ALTER TABLE orders ALTER COLUMN reference SET NOT NULL;

-- --- Rider document URLs -----------------------------------------------------

ALTER TABLE riders ADD COLUMN IF NOT EXISTS license_doc_url TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS vehicle_doc_url TEXT;

-- --- Platform config ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id)
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read config (pricing Edge Functions need it too)
CREATE POLICY "Authenticated users can read platform config"
  ON platform_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can change config
CREATE POLICY "Admins can manage platform config"
  ON platform_config FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed with values matching packages/constants/src/index.ts
INSERT INTO platform_config (key, value, description) VALUES
  ('base_fee',            '500',  'Flat fee charged on every order (NGN)'),
  ('per_km_fee',          '100',  'Fee per kilometre of distance (NGN)'),
  ('insurance_fee',       '200',  'Optional insurance flat fee (NGN)'),
  ('platform_commission', '0.15', 'Platform commission rate as a decimal (e.g. 0.15 = 15%)')
ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at on config changes
CREATE TRIGGER update_platform_config_updated_at
  BEFORE UPDATE ON platform_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
