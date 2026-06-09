'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { riderProfileSchema } from '@sendit/validations'

export async function createRiderProfileAction(data: unknown) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = riderProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid rider profile data' }
  }

  // Check if rider already exists (handles resubmission by rejected riders)
  const { data: existing } = await supabase
    .from('riders')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status !== 'rejected') return { error: 'Rider profile already exists' }
    // Resubmission: reset status to pending and clear rejection reason
    const { error } = await supabase
      .from('riders')
      .update({
        vehicle_type: parsed.data.vehicle_type,
        vehicle_plate: parsed.data.vehicle_plate,
        vehicle_model: parsed.data.vehicle_model,
        license_number: parsed.data.license_number,
        status: 'pending',
        rejection_reason: null,
      })
      .eq('user_id', user.id)
    if (error) return { error: 'Failed to resubmit rider profile' }
    return { success: true }
  }

  const { error } = await supabase.from('riders').insert({
    user_id: user.id,
    vehicle_type: parsed.data.vehicle_type,
    vehicle_plate: parsed.data.vehicle_plate,
    vehicle_model: parsed.data.vehicle_model,
    license_number: parsed.data.license_number,
    status: 'pending',
    is_online: false,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Rider profile already exists' }
    return { error: 'Failed to create rider profile' }
  }

  return { success: true }
}

export async function uploadRiderDocumentAction(docType: 'license' | 'vehicle', imageUrl: string) {
  if (!['license', 'vehicle'].includes(docType)) return { error: 'Invalid document type' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Validate URL points to our rider-documents bucket
  const supabaseStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object`
  const expectedPrefix = `${supabaseStorageBase}/public/rider-documents/${user.id}/`
  if (!imageUrl.startsWith(expectedPrefix)) return { error: 'Invalid document URL' }

  const column = docType === 'license' ? 'license_doc_url' : 'vehicle_doc_url'
  const { error } = await supabase
    .from('riders')
    .update({ [column]: imageUrl })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to save document' }

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/profile')
  return { success: true }
}

export async function toggleOnlineStatusAction(isOnline: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!isOnline) {
    // Block going offline when rider has an active delivery
    const { data: rider } = await supabase
      .from('riders')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (rider) {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', rider.id)
        .in('status', ['accepted', 'picked_up', 'in_transit'])

      if ((count ?? 0) > 0) {
        return { error: 'You have an active delivery. Complete it before going offline.' }
      }
    }
  }

  const { error } = await supabase
    .from('riders')
    .update({ is_online: isOnline })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update status' }

  revalidatePath('/rider/dashboard')
  return { success: true }
}
