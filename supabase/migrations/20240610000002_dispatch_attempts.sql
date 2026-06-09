-- Track how many auto-dispatch attempts have been made per order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_attempts INTEGER NOT NULL DEFAULT 0;
