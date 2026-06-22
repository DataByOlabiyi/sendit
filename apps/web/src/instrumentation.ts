export async function register() {
  // Only validate on the Node.js server runtime (not edge, not client)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'PAYSTACK_SECRET_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]

  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `[sendit/web] Missing required environment variables at startup: ${missing.join(', ')}`,
    )
  }
}
