-- ---------------------------------------------------------------------------
-- Add platform_fee and rider_payout to payments
-- ---------------------------------------------------------------------------
-- PLATFORM_COMMISSION is 15% (see packages/constants).
-- These columns make the split explicit in the ledger so we have an auditable
-- record of what the platform earned and what is owed to the rider on each
-- transaction, rather than recomputing it at report time.
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rider_payout  NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Back-fill existing paid rows using the 15% commission rate.
-- Rows with amount = 0 (edge cases / test data) are left at 0.
UPDATE public.payments
SET
  platform_fee = ROUND(amount * 0.15, 2),
  rider_payout  = ROUND(amount * 0.85, 2)
WHERE status = 'paid' AND amount > 0;
