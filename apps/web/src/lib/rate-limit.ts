import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const LOCKOUT_THRESHOLD = 5      // consecutive failures before lockout
const LOCKOUT_TTL_SECONDS = 900  // 15 minutes

// Gracefully returns null when UPSTASH_REDIS_REST_URL / TOKEN are absent (local dev).
// All callers treat null as "allow" so the app works without Redis credentials.
function createLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

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
  }
}

const limiters = createLimiters()

export async function checkLoginRate(ip: string, email: string): Promise<boolean> {
  if (!limiters) return true
  const [byIp, byEmail] = await Promise.all([
    limiters.loginByIp.limit(ip),
    limiters.loginByEmail.limit(email.toLowerCase()),
  ])
  return byIp.success && byEmail.success
}

export async function checkRegisterRate(ip: string): Promise<boolean> {
  if (!limiters) return true
  const { success } = await limiters.registerByIp.limit(ip)
  return success
}

export async function checkForgotRate(email: string): Promise<boolean> {
  if (!limiters) return true
  const { success } = await limiters.forgotByEmail.limit(email.toLowerCase())
  return success
}

// ── Consecutive failure / lockout tracking ────────────────────────────────────

interface FailureResult {
  locked: boolean
  firstLockout: boolean  // true only the first time the threshold is crossed
}

export async function recordLoginFailure(email: string): Promise<FailureResult> {
  if (!limiters) return { locked: false, firstLockout: false }

  const key = `auth:lock:${email.toLowerCase()}`
  const count = await limiters.redis.incr(key)

  if (count === 1) {
    // First failure in this window — set the TTL
    await limiters.redis.expire(key, LOCKOUT_TTL_SECONDS)
  }

  const locked = count >= LOCKOUT_THRESHOLD
  const firstLockout = count === LOCKOUT_THRESHOLD
  return { locked, firstLockout }
}

export async function isAccountLocked(email: string): Promise<boolean> {
  if (!limiters) return false
  const count = await limiters.redis.get<number>(`auth:lock:${email.toLowerCase()}`)
  return (count ?? 0) >= LOCKOUT_THRESHOLD
}

export async function resetLoginFailures(email: string): Promise<void> {
  if (!limiters) return
  await limiters.redis.del(`auth:lock:${email.toLowerCase()}`)
}
