import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const LOCKOUT_THRESHOLD = 5      // consecutive failures before lockout
const LOCKOUT_TTL_SECONDS = 900  // 15 minutes

// Gracefully returns null when UPSTASH_REDIS_REST_URL / TOKEN are absent (local dev).
// All callers treat null as "allow" so the app works without Redis credentials.
function createLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[sendit/rate-limit] Upstash credentials absent — all rate limiters disabled')
    }
    return null
  }

  const redis = new Redis({ url, token })
  return {
    redis,
    // 10 login attempts per IP per minute
    loginByIp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rl:login:ip',
    }),
    // 5 login attempts per email per minute (per-account guard)
    loginByEmail: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:login:email',
    }),
    // 5 registration attempts per IP per minute
    registerByIp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:reg:ip',
    }),
    // 3 forgot-password requests per email per 10 minutes
    forgotByEmail: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '10 m'),
      prefix: 'rl:forgot:email',
    }),
    // 5 booking submissions per user per minute
    bookingByUser: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:book:user',
    }),
    // 5 Paystack initialize requests per user per minute
    paystackInitByUser: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:psinit:user',
    }),
    // 10 Paystack verify requests per user per minute
    paystackVerifyByUser: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rl:psverify:user',
    }),
  }
}

const limiters = createLimiters()

// These guards sit in front of Supabase's own password check, which stays
// authoritative regardless of Redis health — so failing open on an Upstash
// error only skips the extra abuse counter for the outage window, it never
// bypasses authentication itself.
export async function checkLoginRate(ip: string, email: string): Promise<boolean> {
  if (!limiters) return true
  try {
    const [byIp, byEmail] = await Promise.all([
      limiters.loginByIp.limit(ip),
      limiters.loginByEmail.limit(email.toLowerCase()),
    ])
    return byIp.success && byEmail.success
  } catch (err) {
    console.error('[sendit/rate-limit] checkLoginRate failed, allowing request:', err)
    return true
  }
}

export async function checkRegisterRate(ip: string): Promise<boolean> {
  if (!limiters) return true
  try {
    const { success } = await limiters.registerByIp.limit(ip)
    return success
  } catch (err) {
    console.error('[sendit/rate-limit] checkRegisterRate failed, allowing request:', err)
    return true
  }
}

export async function checkForgotRate(email: string): Promise<boolean> {
  if (!limiters) return true
  try {
    const { success } = await limiters.forgotByEmail.limit(email.toLowerCase())
    return success
  } catch (err) {
    console.error('[sendit/rate-limit] checkForgotRate failed, allowing request:', err)
    return true
  }
}

// Upstash is an external network dependency for a non-security-critical
// abuse guard here — a transient blip must not take down checkout, so this
// one fails open (same as the "credentials absent" case) rather than
// throwing uncaught.
export async function checkBookingRate(userId: string): Promise<boolean> {
  if (!limiters) return true
  try {
    const { success } = await limiters.bookingByUser.limit(userId)
    return success
  } catch (err) {
    console.error('[sendit/rate-limit] checkBookingRate failed, allowing request:', err)
    return true
  }
}

// Same non-security-critical classification as checkBookingRate above — an
// Upstash outage must not block a customer from paying for an order already
// created.
export async function checkPaystackInitRate(userId: string): Promise<boolean> {
  if (!limiters) return true
  try {
    const { success } = await limiters.paystackInitByUser.limit(userId)
    return success
  } catch (err) {
    console.error('[sendit/rate-limit] checkPaystackInitRate failed, allowing request:', err)
    return true
  }
}

export async function checkPaystackVerifyRate(userId: string): Promise<boolean> {
  if (!limiters) return true
  try {
    const { success } = await limiters.paystackVerifyByUser.limit(userId)
    return success
  } catch (err) {
    console.error('[sendit/rate-limit] checkPaystackVerifyRate failed, allowing request:', err)
    return true
  }
}

// ── Consecutive failure / lockout tracking ────────────────────────────────────

interface FailureResult {
  locked: boolean
  firstLockout: boolean  // true only the first time the threshold is crossed
}

export async function recordLoginFailure(email: string): Promise<FailureResult> {
  if (!limiters) return { locked: false, firstLockout: false }

  try {
    const key = `auth:lock:${email.toLowerCase()}`
    const count = await limiters.redis.incr(key)

    if (count === 1) {
      // First failure in this window — set the TTL
      await limiters.redis.expire(key, LOCKOUT_TTL_SECONDS)
    }

    const locked = count >= LOCKOUT_THRESHOLD
    const firstLockout = count === LOCKOUT_THRESHOLD
    return { locked, firstLockout }
  } catch (err) {
    console.error('[sendit/rate-limit] recordLoginFailure failed, not locking:', err)
    return { locked: false, firstLockout: false }
  }
}

export async function isAccountLocked(email: string): Promise<boolean> {
  if (!limiters) return false
  try {
    const count = await limiters.redis.get<number>(`auth:lock:${email.toLowerCase()}`)
    return (count ?? 0) >= LOCKOUT_THRESHOLD
  } catch (err) {
    console.error('[sendit/rate-limit] isAccountLocked failed, allowing request:', err)
    return false
  }
}

export async function resetLoginFailures(email: string): Promise<void> {
  if (!limiters) return
  try {
    await limiters.redis.del(`auth:lock:${email.toLowerCase()}`)
  } catch (err) {
    console.error('[sendit/rate-limit] resetLoginFailures failed:', err)
  }
}
