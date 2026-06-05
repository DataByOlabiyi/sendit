-- ---------------------------------------------------------------------------
-- Row Level Security Policies
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- --- Helper Functions -------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_rider()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'rider');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --- Users ------------------------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (is_admin());

-- --- Riders -----------------------------------------------------------------

CREATE POLICY "Anyone can view approved online riders"
  ON riders FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Riders can view own record"
  ON riders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all riders"
  ON riders FOR SELECT
  USING (is_admin());

CREATE POLICY "Riders can insert own record"
  ON riders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Riders can update own record"
  ON riders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update any rider"
  ON riders FOR UPDATE
  USING (is_admin());

-- --- Addresses --------------------------------------------------------------

CREATE POLICY "Users can manage own addresses"
  ON addresses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (is_admin());

-- --- Orders -----------------------------------------------------------------

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Riders can view assigned and pending orders"
  ON orders FOR SELECT
  USING (
    rider_id = (SELECT id FROM riders WHERE user_id = auth.uid())
    OR (status = 'pending' AND is_rider())
  );

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND get_user_role(auth.uid()) = 'customer'
  );

CREATE POLICY "Riders can update assigned orders"
  ON orders FOR UPDATE
  USING (
    rider_id = (SELECT id FROM riders WHERE user_id = auth.uid())
  )
  WITH CHECK (
    status IN ('accepted', 'picked_up', 'in_transit', 'delivered')
  );

CREATE POLICY "Customers can cancel own pending orders"
  ON orders FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  USING (is_admin());

-- --- Order Tracking ---------------------------------------------------------

CREATE POLICY "Order parties can view tracking"
  ON order_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND (
        o.customer_id = auth.uid()
        OR o.rider_id = (SELECT id FROM riders WHERE user_id = auth.uid())
        OR is_admin()
      )
    )
  );

CREATE POLICY "Riders can insert tracking for own orders"
  ON order_tracking FOR INSERT
  WITH CHECK (
    rider_id = (SELECT id FROM riders WHERE user_id = auth.uid())
  );

-- --- Payments ---------------------------------------------------------------

CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (is_admin());

CREATE POLICY "Customers can create payments"
  ON payments FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- --- Payment Methods --------------------------------------------------------

CREATE POLICY "Users can manage own payment methods"
  ON payment_methods FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- --- Notifications ----------------------------------------------------------

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE); -- Controlled via service role in server actions

-- --- Chat Messages ----------------------------------------------------------

CREATE POLICY "Order parties can view messages"
  ON chat_messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Authenticated users can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND (
        o.customer_id = auth.uid()
        OR o.rider_id = (SELECT id FROM riders WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Receivers can mark messages as read"
  ON chat_messages FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (is_read = TRUE);

-- --- Reviews ----------------------------------------------------------------

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Customers can review completed orders"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.customer_id = auth.uid()
      AND o.status = 'delivered'
    )
  );
