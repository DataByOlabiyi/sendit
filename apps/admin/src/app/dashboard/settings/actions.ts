'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const settingsSchema = z.object({
  base_fee: z.number().min(0).max(100000),
  per_km_fee: z.number().min(0).max(10000),
  insurance_fee: z.number().min(0).max(10000),
  platform_commission: z.number().min(0).max(1),
})

export async function saveSettingsAction(input: unknown) {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid settings' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates = [
    { key: 'base_fee', value: String(parsed.data.base_fee) },
    { key: 'per_km_fee', value: String(parsed.data.per_km_fee) },
    { key: 'insurance_fee', value: String(parsed.data.insurance_fee) },
    { key: 'platform_commission', value: String(parsed.data.platform_commission) },
  ]

  for (const update of updates) {
    const { error } = await supabase
      .from('platform_config')
      .upsert({ ...update, updated_by: user.id }, { onConflict: 'key' })

    if (error) return { error: `Failed to save ${update.key}: ${error.message}` }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function loadSettingsAction() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('platform_config')
    .select('key, value')

  if (error || !data) {
    return {
      base_fee: 500,
      per_km_fee: 100,
      insurance_fee: 200,
      platform_commission: 0.15,
    }
  }

  const map = Object.fromEntries(data.map((r) => [r.key, r.value]))

  return {
    base_fee: Number(map['base_fee'] ?? 500),
    per_km_fee: Number(map['per_km_fee'] ?? 100),
    insurance_fee: Number(map['insurance_fee'] ?? 200),
    platform_commission: Number(map['platform_commission'] ?? 0.15),
  }
}
