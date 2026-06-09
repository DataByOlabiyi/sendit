-- BVN/NIN for rider KYC verification
ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS bvn        TEXT,
  ADD COLUMN IF NOT EXISTS nin        TEXT,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'failed'));
