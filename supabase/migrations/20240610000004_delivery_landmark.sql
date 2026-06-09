-- Free-text landmark field to help riders find the delivery location
-- especially useful for Nigerian addresses (e.g., "After the filling station", "Beside GTBank")
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_landmark TEXT;
