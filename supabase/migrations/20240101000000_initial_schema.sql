-- ---------------------------------------------------------------------------
-- SendIt Initial Schema
-- ---------------------------------------------------------------------------

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "postgis";

-- --- Enums ------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('customer', 'rider', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('paystack', 'wallet', 'cash');
CREATE TYPE vehicle_type AS ENUM ('bicycle', 'motorcycle', 'car', 'van');
CREATE TYPE package_size AS ENUM ('small', 'medium', 'large', 'extra_large');
CREATE TYPE rider_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
CREATE TYPE notification_type AS ENUM ('order_update', 'chat_message', 'payment', 'promotion', 'system');

-- --- Users ------------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- --- Riders -----------------------------------------------------------------

CREATE TABLE riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type vehicle_type NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  license_number TEXT NOT NULL,
  status rider_status NOT NULL DEFAULT 'pending',
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_riders_user_id ON riders(user_id);
CREATE INDEX idx_riders_status ON riders(status);
CREATE INDEX idx_riders_is_online ON riders(is_online);

-- --- Addresses --------------------------------------------------------------

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  full_address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- --- Orders -----------------------------------------------------------------

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  rider_id UUID REFERENCES riders(id),
  pickup_address_id UUID REFERENCES addresses(id),
  delivery_address_id UUID REFERENCES addresses(id),
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION NOT NULL,
  delivery_lng DOUBLE PRECISION NOT NULL,
  package_description TEXT NOT NULL,
  package_size package_size NOT NULL,
  package_weight NUMERIC(8,2),
  is_fragile BOOLEAN NOT NULL DEFAULT FALSE,
  has_insurance BOOLEAN NOT NULL DEFAULT FALSE,
  special_instructions TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  estimated_distance_km NUMERIC(8,2),
  estimated_duration_min INTEGER,
  base_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  distance_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'paystack',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  proof_of_delivery_url TEXT,
  cancelled_reason TEXT,
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_rider_id ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- --- Order Tracking ---------------------------------------------------------

CREATE TABLE order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES riders(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX idx_order_tracking_recorded_at ON order_tracking(recorded_at DESC);

-- --- Payments ---------------------------------------------------------------

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  paystack_reference TEXT UNIQUE,
  paystack_access_code TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_paystack_reference ON payments(paystack_reference);

-- --- Payment Methods --------------------------------------------------------

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank')),
  label TEXT NOT NULL,
  last_four TEXT,
  bank_name TEXT,
  paystack_authorization_code TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- --- Notifications ----------------------------------------------------------

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- --- Chat Messages ----------------------------------------------------------

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- --- Reviews ----------------------------------------------------------------

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_order_id ON reviews(order_id);

-- --- Functions --------------------------------------------------------------

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON riders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update rider rating on new review
CREATE OR REPLACE FUNCTION update_rider_rating()
RETURNS TRIGGER AS $$
DECLARE
  rider_user_id UUID;
BEGIN
  SELECT user_id INTO rider_user_id FROM riders WHERE id = (
    SELECT rider_id FROM orders WHERE id = NEW.order_id
  );

  IF rider_user_id = NEW.reviewee_id THEN
    UPDATE riders
    SET rating = (
      SELECT AVG(r.rating)
      FROM reviews r
      JOIN orders o ON r.order_id = o.id
      JOIN riders rd ON o.rider_id = rd.id
      WHERE rd.user_id = NEW.reviewee_id
    ),
    total_deliveries = total_deliveries + 1
    WHERE user_id = NEW.reviewee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_rider_rating();

-- Order status timestamps
CREATE OR REPLACE FUNCTION update_order_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    CASE NEW.status
      WHEN 'accepted' THEN NEW.accepted_at = NOW();
      WHEN 'picked_up' THEN NEW.picked_up_at = NOW();
      WHEN 'in_transit' THEN NEW.in_transit_at = NOW();
      WHEN 'delivered' THEN NEW.delivered_at = NOW();
      WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_timestamps
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_order_status_timestamps();
