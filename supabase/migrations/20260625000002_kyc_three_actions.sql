-- ---------------------------------------------------------------------------
-- KYC Three-Action Review Flow
-- ---------------------------------------------------------------------------
-- Adds needs_info and banned rider statuses, admin_question /
-- resubmission_note columns, and unique BVN/NIN partial indexes to prevent
-- a banned identity from re-registering under a new account.
-- ---------------------------------------------------------------------------

-- Extend the enum — safe to run in a transaction on PostgreSQL 12+
ALTER TYPE rider_status ADD VALUE IF NOT EXISTS 'needs_info';
ALTER TYPE rider_status ADD VALUE IF NOT EXISTS 'banned';

-- Admin's message to the rider when requesting additional information
ALTER TABLE riders ADD COLUMN IF NOT EXISTS admin_question TEXT;

-- Rider's optional note when resubmitting after needs_info or rejection
ALTER TABLE riders ADD COLUMN IF NOT EXISTS resubmission_note TEXT;

-- Partial unique indexes on BVN/NIN: a banned rider cannot reappear under a
-- new auth account with the same identity numbers.
-- WHERE NOT NULL so new riders without BVN/NIN are not blocked.
CREATE UNIQUE INDEX IF NOT EXISTS riders_bvn_unique ON riders(bvn) WHERE bvn IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS riders_nin_unique ON riders(nin) WHERE nin IS NOT NULL;
