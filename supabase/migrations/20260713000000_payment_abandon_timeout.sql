-- ---------------------------------------------------------------------------
-- payment_config — timeout for orders abandoned before payment ever succeeded
-- (distinct from order_timeout_minutes, which covers paid orders no rider
-- accepted). Consumed by the order-timeout edge function's second sweep.
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_config (key, value, description) VALUES
  ('payment_abandon_timeout_minutes', '20', 'Minutes after creation before an order still unpaid (Paystack/wallet, payment_status=pending) is auto-cancelled')
ON CONFLICT (key) DO NOTHING;
