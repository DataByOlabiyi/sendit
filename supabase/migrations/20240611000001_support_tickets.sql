-- Customer support tickets
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_category AS ENUM ('order_issue', 'payment', 'account', 'technical', 'other');

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  order_id      UUID REFERENCES orders(id),
  category      ticket_category NOT NULL DEFAULT 'other',
  subject       TEXT NOT NULL,
  description   TEXT NOT NULL,
  status        ticket_status NOT NULL DEFAULT 'open',
  assigned_to   UUID REFERENCES auth.users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES auth.users(id),
  message    TEXT NOT NULL,
  is_staff   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status  ON support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket  ON ticket_messages(ticket_id);

ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tickets" ON support_tickets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all tickets" ON support_tickets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Ticket participants read messages" ON ticket_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM support_tickets WHERE id = ticket_messages.ticket_id
    ) OR is_admin()
  );

CREATE POLICY "Ticket participants send messages" ON ticket_messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM support_tickets WHERE id = ticket_messages.ticket_id
    ) OR is_admin()
  );
