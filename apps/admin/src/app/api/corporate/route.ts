import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const createOrgSchema = z.object({
  action: z.literal('create_org'),
  name: z.string().min(1).max(200),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  rc_number: z.string().optional(),
  tax_id: z.string().optional(),
  credit_limit: z.number().int().nonnegative().default(0),
})

const updateOrgSchema = z.object({
  action: z.literal('update_org'),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  rc_number: z.string().optional(),
  tax_id: z.string().optional(),
  credit_limit: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

const addMemberSchema = z.object({
  action: z.literal('add_member'),
  orgId: z.string().uuid(),
  email: z.string().email('Invalid email'),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
})

const removeMemberSchema = z.object({
  action: z.literal('remove_member'),
  memberId: z.string().uuid(),
})

const bodySchema = z.discriminatedUnion('action', [
  createOrgSchema, updateOrgSchema, addMemberSchema, removeMemberSchema,
])

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

  if (data.action === 'create_org') {
    const { data: org, error } = await admin.from('organizations').insert({
      name: data.name, email: data.email,
      phone: data.phone ?? null, address: data.address ?? null,
      rc_number: data.rc_number ?? null, tax_id: data.tax_id ?? null,
      credit_limit: data.credit_limit,
    }).select().single()
    if (error) return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    return NextResponse.json({ org })
  }

  if (data.action === 'update_org') {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.email !== undefined) updates.email = data.email
    if (data.phone !== undefined) updates.phone = data.phone
    if (data.address !== undefined) updates.address = data.address
    if (data.rc_number !== undefined) updates.rc_number = data.rc_number
    if (data.tax_id !== undefined) updates.tax_id = data.tax_id
    if (data.credit_limit !== undefined) updates.credit_limit = data.credit_limit
    if (data.is_active !== undefined) updates.is_active = data.is_active

    const { error } = await admin.from('organizations').update(updates).eq('id', data.orgId)
    if (error) return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (data.action === 'add_member') {
    // Resolve email → user id
    const { data: targetUser } = await admin
      .from('users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    if (!targetUser) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })

    const { error } = await admin.from('organization_members').insert({
      organization_id: data.orgId,
      user_id: targetUser.id,
      role: data.role,
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }
    return NextResponse.json({ success: true, userId: targetUser.id })
  }

  if (data.action === 'remove_member') {
    const { error } = await admin.from('organization_members').delete().eq('id', data.memberId)
    if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('organization_members')
    .select('id, role, joined_at, users!organization_members_user_id_fkey(full_name, email, phone)')
    .eq('organization_id', orgId)
    .order('joined_at')

  return NextResponse.json({ members: members ?? [] })
}
