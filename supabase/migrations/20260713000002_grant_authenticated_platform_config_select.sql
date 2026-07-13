-- Same class of bug as 20260713000001 (payments INSERT), one link further
-- down the chain: compute_payment_splits() runs BEFORE INSERT ON payments
-- and reads platform_config for the commission rate. That SELECT executes
-- as the invoking (authenticated) role, not the table owner, so it hit the
-- same missing-grant wall — RLS policy "Authenticated users can read
-- platform config" was correct, but the underlying GRANT was never issued.
-- Confirmed via production logs: "permission denied for table
-- platform_config" on every /api/paystack/initialize payments insert,
-- even after the payments INSERT grant was fixed.

GRANT SELECT ON public.platform_config TO authenticated;
