-- Same class of bug as 20260709000000 (push_subscriptions), 20260710000000
-- (riders), 20260710000001 (orders SELECT), and 20260710000002 (orders
-- INSERT/UPDATE): payments never had INSERT granted to the authenticated
-- role. This is the direct cause of "Failed to create payment record" on
-- every Paystack checkout — /api/paystack/initialize's `payments` insert
-- (the only non-admin write against this table; verify/webhook/refund all
-- use the service-role client) has never been able to succeed via the
-- regular cookie-based client, so every order paid by Paystack has been
-- stuck with no payment row at all, regardless of what the customer did
-- in the payment popup.
--
-- No UPDATE, DELETE, or UPSERT against payments is attempted via any
-- non-admin client anywhere in the codebase, so this grants only what's used.

GRANT INSERT ON public.payments TO authenticated;
