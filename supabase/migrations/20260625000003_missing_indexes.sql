-- composite index for payment idempotency guard (order_id + customer_id + status)
CREATE INDEX IF NOT EXISTS idx_payments_order_customer_status
    ON payments (order_id, customer_id, status);

-- rider-based lookup on order_tracking
CREATE INDEX IF NOT EXISTS idx_order_tracking_rider_id
    ON order_tracking (rider_id);
