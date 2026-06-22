// Restrict to known app origins. SUPABASE_ALLOWED_ORIGINS env var can override
// for local development (e.g. "http://localhost:3000,http://localhost:3001").
const defaultOrigins = [
  'https://sendit.vercel.app',
  'https://admin.sendit.vercel.app',
]

const allowedOrigins: string[] = (
  Deno.env.get('SUPABASE_ALLOWED_ORIGINS') ?? defaultOrigins.join(',')
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

// Backwards-compatible export for edge functions that haven't migrated yet.
export const corsHeaders = getCorsHeaders(null)
