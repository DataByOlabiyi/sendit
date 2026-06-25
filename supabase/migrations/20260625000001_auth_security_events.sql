-- Auth security events — separate from admin_audit_logs because:
--   1. actor_id is nullable (failed logins have no known user)
--   2. These are user-facing auth events, not admin actions
--   3. Volume is higher; keeping them isolated preserves audit log clarity

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event        TEXT        NOT NULL,            -- e.g. 'auth.login_success', 'auth.lockout'
  email        TEXT,                             -- email used in the attempt (may not exist as a user)
  user_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address   TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_email   ON public.auth_security_events(email);
CREATE INDEX IF NOT EXISTS idx_auth_events_user    ON public.auth_security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event   ON public.auth_security_events(event);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON public.auth_security_events(created_at DESC);

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

-- Admins can read; nobody can write directly (service-role inserts only)
CREATE POLICY "Admins can read auth security events"
  ON public.auth_security_events FOR SELECT
  USING (is_admin());

-- Expose to service_role via the blanket grant added in 20260624000003
