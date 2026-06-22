import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const createKeySchema = z.object({
  action: z.literal('create_key'),
  name: z.string().min(1).max(100),
  userId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  scopes: z.array(z.string()).min(1).default(['orders:create', 'orders:read']),
  expiresAt: z.string().datetime({ offset: true }).optional(),
})

const revokeKeySchema = z.object({
  action: z.literal('revoke_key'),
  keyId: z.string().uuid(),
})

const bodySchema = z.discriminatedUnion('action', [createKeySchema, revokeKeySchema])

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return user
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const admin = createAdminClient()
  const data = parsed.data

  if (data.action === 'create_key') {
    // Generate a cryptographically random 32-byte key
    const rawBytes = crypto.getRandomValues(new Uint8Array(32))
    const rawKey = Array.from(rawBytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    const prefix = `sdk_${rawKey.slice(0, 8)}`
    const fullKey = `${prefix}_${rawKey.slice(8)}`

    // Hash the key using SHA-256 — only the hash is stored
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullKey))
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')

    const { data: newKey, error } = await admin.from('api_keys').insert({
      user_id: data.userId,
      organization_id: data.orgId ?? null,
      name: data.name,
      key_hash: keyHash,
      prefix,
      scopes: data.scopes,
      expires_at: data.expiresAt ?? null,
    }).select('id, name, prefix, scopes, expires_at, created_at').single()

    if (error) return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })

    // Return the full key once — it cannot be recovered after this
    return NextResponse.json({ key: newKey, fullKey })
  }

  if (data.action === 'revoke_key') {
    const { error } = await admin
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', data.keyId)
    if (error) return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
