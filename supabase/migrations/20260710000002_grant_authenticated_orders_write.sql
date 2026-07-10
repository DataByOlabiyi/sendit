-- Same class of bug as 20260710000001 (orders SELECT), 20260710000000
-- (riders), and 20260709000000 (push_subscriptions): orders never had
-- INSERT/UPDATE granted to the authenticated role. This is the direct
-- cause of the production 500 on checkout — createOrderAction's
-- `orders` insert (Paystack/cash path) has never been able to succeed
-- via the regular cookie-based client. The same gap breaks every rider
-- order-status transition (accept, advance status, proof of delivery,
-- mark failed, return in progress, mark returned), all of which UPDATE
-- orders via the cookie client rather than the service-role client.
--
-- No DELETE or UPSERT against orders is attempted via any non-admin
-- client anywhere in the codebase, so this grants only what's used.

GRANT INSERT, UPDATE ON public.orders TO authenticated;
