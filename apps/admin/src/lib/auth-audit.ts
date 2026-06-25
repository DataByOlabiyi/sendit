import { createAdminClient } from '@/lib/supabase/admin'

export type AuthEvent =
  | 'auth.admin_login_success'
  | 'auth.admin_login_failure'
  | 'auth.admin_lockout'
  | 'auth.admin_logout'
  | 'auth.admin_mfa_enrolled'
  | 'auth.admin_mfa_unenrolled'
  | 'auth.admin_mfa_verified'
  | 'auth.admin_rate_limit_hit'

interface LogAuthEventParams {
  event: AuthEvent
  email?: string
  userId?: string
  ip: string
  metadata?: Record<string, unknown>
}

// Fire-and-forget — never throws. Logging must never block or break auth flows.
export async function logAuthEvent(params: LogAuthEventParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('auth_security_events').insert({
      event: params.event,
      email: params.email?.toLowerCase(),
      user_id: params.userId ?? null,
      ip_address: params.ip,
      metadata: params.metadata ?? null,
    })
  } catch {
    // Swallowed intentionally
  }
}
