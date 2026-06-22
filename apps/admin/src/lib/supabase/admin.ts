import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely.
// Use ONLY in server-side code (Server Actions, API routes).
// Never import this in client components or expose to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service-role configuration')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
