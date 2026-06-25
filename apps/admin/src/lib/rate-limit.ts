import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Admin thresholds are deliberately stricter than the customer-facing app.
const LOCKOUT_THRESHOLD = 5
const LOCKOUT_TTL_SECONDS = 900  // 15 minutes

function createLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const redis = new Redis({ url, token })
  return {
    redis,
    // 5 attempts per IP per minute
    loginByIp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:admin:login:ip',
    }),
    // 3 attempts per email per minute
    loginByEmail: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'),
      prefix: 'rl:admin:login:email',
    }),
  }
}

const limiters = createLimiters()

export async function checkAdminLoginRate(ip: string, email: string): Promise<boolean> {
  if (!limiters) return true
  const [byIp, byEmail] = await Promise.all([
    limiters.loginByIp.limit(ip),
    limiters.loginByEmail.limit(email.toLowerCase()),
  ])
  return byIp.success && byEmail.success
}

// ── Consecutive failure / lockout tracking ────────────────────────────────────

interface FailureResult {
  locked: boolean
  firstLockout: boolean
}

export async function recordAdminLoginFailure(email: string): Promise<FailureResult> {
  if (!limiters) return { locked: false, firstLockout: false }

  const key = `auth:admin:lock:${email.toLowerCase()}`
  const count = await limiters.redis.incr(key)

  if (count === 1) {
    await limiters.redis.expire(key, LOCKOUT_TTL_SECONDS)
  }

  const locked = count >= LOCKOUT_THRESHOLD
  const firstLockout = count === LOCKOUT_THRESHOLD
  return { locked, firstLockout }
}

export async function isAdminAccountLocked(email: string): Promise<boolean> {
  if (!limiters) return false
  const count = await limiters.redis.get<number>(`auth:admin:lock:${email.toLowerCase()}`)
  return (count ?? 0) >= LOCKOUT_THRESHOLD
}

export async function resetAdminLoginFailures(email: string): Promise<void> {
  if (!limiters) return
  await limiters.redis.del(`auth:admin:lock:${email.toLowerCase()}`)
}
