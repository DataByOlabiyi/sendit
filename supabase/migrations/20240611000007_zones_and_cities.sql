-- City / zone framework for multi-city dispatch and pricing
CREATE TABLE IF NOT EXISTS cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  state       TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Nigeria',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id     UUID NOT NULL REFERENCES cities(id),
  name        TEXT NOT NULL,
  boundary    GEOGRAPHY(POLYGON, 4326),  -- PostGIS polygon boundary
  base_fee    INTEGER,                   -- override platform default (kobo)
  per_km_fee  INTEGER,                   -- override platform default (kobo)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link orders to a city for routing and analytics
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id);

-- Seed Lagos as the initial city
INSERT INTO cities (name, state, lat, lng)
  VALUES ('Lagos', 'Lagos State', 6.5244, 3.3792)
  ON CONFLICT (name) DO NOTHING;

ALTER TABLE cities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active cities" ON cities FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Anyone can read active zones" ON delivery_zones FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage cities" ON cities FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage zones" ON delivery_zones FOR ALL USING (is_admin()) WITH CHECK (is_admin());
