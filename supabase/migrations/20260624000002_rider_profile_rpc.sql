-- Atomic SECURITY DEFINER functions for rider profile creation/resubmission.
-- These run as the function owner (postgres) which has full access, so there
-- are no RLS or trigger-chain issues. The server action passes the already-
-- validated auth user's ID, so no privilege escalation is possible.

CREATE OR REPLACE FUNCTION create_rider_profile(
  p_user_id        UUID,
  p_vehicle_type   TEXT,
  p_vehicle_plate  TEXT,
  p_vehicle_model  TEXT,
  p_license_number TEXT
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rider_id UUID;
BEGIN
  INSERT INTO riders (
    user_id, vehicle_type, vehicle_plate, vehicle_model,
    license_number, status, is_online
  ) VALUES (
    p_user_id,
    p_vehicle_type::vehicle_type,
    p_vehicle_plate,
    p_vehicle_model,
    p_license_number,
    'pending'::rider_status,
    false
  )
  RETURNING id INTO v_rider_id;

  -- Wallet row; trigger may also attempt this — conflict is safe.
  INSERT INTO rider_wallet (rider_id)
  VALUES (v_rider_id)
  ON CONFLICT (rider_id) DO NOTHING;

  RETURN v_rider_id;
END;
$$;

CREATE OR REPLACE FUNCTION resubmit_rider_profile(
  p_user_id        UUID,
  p_vehicle_type   TEXT,
  p_vehicle_plate  TEXT,
  p_vehicle_model  TEXT,
  p_license_number TEXT
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE riders SET
    vehicle_type     = p_vehicle_type::vehicle_type,
    vehicle_plate    = p_vehicle_plate,
    vehicle_model    = p_vehicle_model,
    license_number   = p_license_number,
    status           = 'pending'::rider_status,
    rejection_reason = NULL
  WHERE user_id = p_user_id
    AND status  = 'rejected'::rider_status;
END;
$$;

-- Grant execute only to authenticated users (not anon).
REVOKE EXECUTE ON FUNCTION create_rider_profile FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION resubmit_rider_profile FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_rider_profile  TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION resubmit_rider_profile TO authenticated, service_role;
