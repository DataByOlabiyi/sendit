-- ---------------------------------------------------------------------------
-- Security & Integrity Fixes
-- ---------------------------------------------------------------------------
-- Addresses:
--   1. handle_new_user: prevent admin self-elevation via signup metadata
--   2. notifications INSERT: restrict to admins only (anon key cannot spam)
--   3. Storage policies: scope proof-of-delivery and chat-attachments to order parties
--   4. update_rider_rating: separate rating recalc from delivery counting
--   5. increment_rider_deliveries: count on order delivery, not on review
--   6. Order status state machine: enforce valid transitions at DB level
--   7. order_tracking composite index: prevent full-scan on per-order queries
--   8. Soft-delete: filter deleted users from standard RLS policies
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. handle_new_user — restrict role to 'customer' or 'rider' only
--    Prevents any caller who passes role='admin' in signup metadata from
--    receiving an admin row in public.users.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'rider' THEN 'rider'::public.user_role
      ELSE 'customer'::public.user_role  -- default; 'admin' is never accepted via signup
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------------------
-- 2. Notifications INSERT policy — restrict to admins
--    The previous WITH CHECK (TRUE) allowed any authenticated user to insert
--    a notification for any other user_id.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (is_admin());

-- Service-role callers (Edge Functions, server actions that import adminClient)
-- bypass RLS entirely, so they are unaffected by this change.


-- ---------------------------------------------------------------------------
-- 3. Storage policies — proof-of-delivery
--    Old SELECT policy used `auth.uid() IS NOT NULL` (any logged-in user).
--    New policies scope access to: the assigned rider, the customer, or admin.
--    Upload is now restricted to the rider assigned to that specific order.
--    Path convention: proof-of-delivery/{order_id}/{filename}
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Riders can upload proof of delivery"   ON storage.objects;
DROP POLICY IF EXISTS "Order parties can view proof of delivery" ON storage.objects;

CREATE POLICY "Assigned rider can upload proof of delivery"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-of-delivery'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
        AND o.status IN ('picked_up', 'in_transit')
    )
  );

CREATE POLICY "Order parties can view proof of delivery"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proof-of-delivery'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (
            o.customer_id = auth.uid()
            OR o.rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
          )
      )
    )
  );


-- ---------------------------------------------------------------------------
-- 4. Storage policies — chat-attachments
--    Old policies used `auth.uid() IS NOT NULL` (any logged-in user).
--    New policies restrict to the customer and rider for that order.
--    Path convention: chat-attachments/{order_id}/{filename}
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments"  ON storage.objects;

CREATE POLICY "Order parties can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND (
          o.customer_id = auth.uid()
          OR o.rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
        )
    )
  );

CREATE POLICY "Order parties can view chat attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (
            o.customer_id = auth.uid()
            OR o.rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
          )
      )
    )
  );


-- ---------------------------------------------------------------------------
-- 5. update_rider_rating — remove total_deliveries side-effect
--    total_deliveries was being incremented on every review INSERT, meaning
--    riders who complete orders without receiving a review have a wrong count,
--    and the metric is conflated with review activity rather than deliveries.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_rider_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_rider_id UUID;
BEGIN
  -- Find the rider for this order
  SELECT o.rider_id INTO target_rider_id
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  -- Only update when the reviewee is actually the rider (not a customer review)
  IF target_rider_id IS NOT NULL AND
     (SELECT user_id FROM public.riders WHERE id = target_rider_id) = NEW.reviewee_id
  THEN
    UPDATE public.riders
    SET rating = (
      SELECT COALESCE(AVG(r.rating), 5.0)
      FROM public.reviews r
      JOIN public.orders o ON r.order_id = o.id
      WHERE o.rider_id = target_rider_id
    )
    WHERE id = target_rider_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------------------
-- 6. increment_rider_deliveries — count on order delivered, not on review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_rider_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.rider_id IS NOT NULL
  THEN
    UPDATE public.riders
    SET total_deliveries = total_deliveries + 1
    WHERE id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION increment_rider_deliveries();


-- ---------------------------------------------------------------------------
-- 7. Order status state machine — enforce valid transitions at DB level
--    Valid forward path: pending → accepted → picked_up → in_transit → delivered
--    Cancellation allowed from: pending, accepted, picked_up, in_transit
--    Terminal states (delivered, cancelled) cannot be left.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending'    AND NEW.status IN ('accepted', 'cancelled')) OR
    (OLD.status = 'accepted'   AND NEW.status IN ('picked_up', 'cancelled')) OR
    (OLD.status = 'picked_up'  AND NEW.status IN ('in_transit', 'cancelled')) OR
    (OLD.status = 'in_transit' AND NEW.status = 'delivered') OR
    -- Terminal states: no exit
    (OLD.status IN ('delivered', 'cancelled') AND NEW.status = OLD.status)
  ) THEN
    RAISE EXCEPTION
      'Invalid order status transition: % → %. Allowed: pending→accepted/cancelled, accepted→picked_up/cancelled, picked_up→in_transit/cancelled, in_transit→delivered.',
      OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_order_status_transitions
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_status_transition();


-- ---------------------------------------------------------------------------
-- 8. order_tracking composite index
--    The existing index is only on order_id. Queries that fetch the latest
--    N tracking points for an order (ORDER BY recorded_at DESC LIMIT n) need
--    a composite index to avoid scanning all rows for a given order.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_recorded
  ON public.order_tracking (order_id, recorded_at DESC);


-- ---------------------------------------------------------------------------
-- 9. Soft-delete: filter deleted users from standard self-view policy
--    deleted_at IS NOT NULL users can no longer authenticate (Supabase
--    disables them), but the RLS policy should be explicit.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() AND deleted_at IS NULL);

-- Admin policy intentionally has no deleted_at filter so admins can audit
-- and restore soft-deleted accounts.
