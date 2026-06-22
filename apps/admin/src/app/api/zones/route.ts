import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const createCitySchema = z.object({
  action: z.literal('create_city'),
  name: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().min(1).max(100).default('Nigeria'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

const toggleCitySchema = z.object({
  action: z.literal('toggle_city'),
  cityId: z.string().uuid(),
  isActive: z.boolean(),
})

const createZoneSchema = z.object({
  action: z.literal('create_zone'),
  cityId: z.string().uuid(),
  name: z.string().min(1).max(100),
  base_fee: z.number().int().nonnegative().optional(),
  per_km_fee: z.number().int().nonnegative().optional(),
})

const updateZoneSchema = z.object({
  action: z.literal('update_zone'),
  zoneId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  base_fee: z.number().int().nonnegative().nullable().optional(),
  per_km_fee: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().optional(),
})

const bodySchema = z.discriminatedUnion('action', [
  createCitySchema,
  toggleCitySchema,
  createZoneSchema,
  updateZoneSchema,
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

  if (data.action === 'create_city') {
    const { data: city, error } = await admin.from('cities').insert({
      name: data.name, state: data.state, country: data.country,
      lat: data.lat ?? null, lng: data.lng ?? null,
    }).select('id, name, state, country, is_active, lat, lng, created_at').single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'City already exists' }, { status: 409 })
      return NextResponse.json({ error: 'Failed to create city' }, { status: 500 })
    }
    return NextResponse.json({ city })
  }

  if (data.action === 'toggle_city') {
    const { error } = await admin.from('cities').update({ is_active: data.isActive }).eq('id', data.cityId)
    if (error) return NextResponse.json({ error: 'Failed to update city' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (data.action === 'create_zone') {
    const { data: zone, error } = await admin.from('delivery_zones').insert({
      city_id: data.cityId, name: data.name,
      base_fee: data.base_fee ?? null, per_km_fee: data.per_km_fee ?? null,
    }).select('id, city_id, name, base_fee, per_km_fee, is_active, created_at').single()
    if (error) return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 })
    return NextResponse.json({ zone })
  }

  if (data.action === 'update_zone') {
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.base_fee !== undefined) updates.base_fee = data.base_fee
    if (data.per_km_fee !== undefined) updates.per_km_fee = data.per_km_fee
    if (data.is_active !== undefined) updates.is_active = data.is_active
    const { error } = await admin.from('delivery_zones').update(updates).eq('id', data.zoneId)
    if (error) return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
