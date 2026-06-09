-- Enable PostGIS extension for spatial queries on rider locations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column for spatial queries alongside the existing lat/lng columns
-- We keep current_lat/current_lng for backwards compatibility; the geometry
-- column is kept in sync by a trigger and used for efficient distance queries.
ALTER TABLE riders ADD COLUMN IF NOT EXISTS current_location GEOGRAPHY(POINT, 4326);

-- Sync trigger: whenever current_lat/current_lng changes, update current_location
CREATE OR REPLACE FUNCTION sync_rider_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_lat IS NOT NULL AND NEW.current_lng IS NOT NULL THEN
    NEW.current_location := ST_SetSRID(
      ST_MakePoint(NEW.current_lng, NEW.current_lat),
      4326
    )::GEOGRAPHY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_rider_location ON riders;
CREATE TRIGGER trigger_sync_rider_location
  BEFORE INSERT OR UPDATE OF current_lat, current_lng ON riders
  FOR EACH ROW EXECUTE FUNCTION sync_rider_location();

-- Spatial index for proximity searches
CREATE INDEX IF NOT EXISTS idx_riders_current_location
  ON riders USING GIST (current_location);

-- Backfill existing rows
UPDATE riders
  SET current_location = ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)::GEOGRAPHY
  WHERE current_lat IS NOT NULL AND current_lng IS NOT NULL;
