'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { riderProfileSchema, riderKycSchema } from '@sendit/validations'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'application/pdf': 'application/pdf',
}

export async function uploadRiderDocToStorageAction(
  docType: 'license' | 'vehicle',
  formData: FormData,
): Promise<{ path?: string; error?: string }> {
  if (!['license', 'vehicle'].includes(docType)) return { error: 'Invalid document type' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const contentType = ALLOWED_MIME_TYPES[file.type]
  if (!contentType) return { error: 'Unsupported file type. Use JPG, PNG or PDF.' }

  if (file.size > 10 * 1024 * 1024) return { error: 'File too large. Maximum size is 10 MB.' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${docType}-${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  // Use admin client for storage upload — RLS on storage.objects blocks the
  // anon-key client even server-side; auth + path scoping above is the guard.
  const adminSupabase = createAdminClient()
  const { data, error: uploadError } = await adminSupabase.storage
    .from('rider-documents')
    .upload(path, bytes, { contentType, upsert: false })

  if (uploadError) return { error: 'Upload failed. Please try again.' }

  return { path: data.path }
}

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

  const admin = createAdminClient()

  // Check if rider already exists (handles resubmission by rejected riders)
  const { data: existing } = await admin
    .from('riders')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status !== 'rejected') return { error: 'Rider profile already exists' }
    // Resubmit via SECURITY DEFINER RPC — bypasses RLS regardless of trigger chain
    const { error } = await supabase.rpc('resubmit_rider_profile', {
      p_user_id:        user.id,
      p_vehicle_type:   parsed.data.vehicle_type,
      p_vehicle_plate:  parsed.data.vehicle_plate,
      p_vehicle_model:  parsed.data.vehicle_model,
      p_license_number: parsed.data.license_number,
    })
    if (error) return { error: 'Failed to resubmit rider profile' }
    revalidatePath('/rider/onboarding')
    revalidatePath('/rider/dashboard')
    return { success: true }
  }

  // Create rider + wallet atomically via SECURITY DEFINER RPC.
  // Avoids any trigger / RLS chain issues with the direct INSERT path.
  const { error } = await supabase.rpc('create_rider_profile', {
    p_user_id:        user.id,
    p_vehicle_type:   parsed.data.vehicle_type,
    p_vehicle_plate:  parsed.data.vehicle_plate,
    p_vehicle_model:  parsed.data.vehicle_model,
    p_license_number: parsed.data.license_number,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Rider profile already exists' }
    return { error: 'Failed to create rider profile' }
  }

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function uploadRiderDocumentAction(docType: 'license' | 'vehicle', storagePath: string) {
  if (!['license', 'vehicle'].includes(docType)) return { error: 'Invalid document type' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Path must be scoped to this user (format: {user_id}/{docType}-{timestamp}.{ext})
  if (!storagePath.startsWith(`${user.id}/`)) return { error: 'Invalid document path' }

  const column = docType === 'license' ? 'license_doc_url' : 'vehicle_doc_url'
  const { error } = await supabase
    .from('riders')
    .update({ [column]: storagePath })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to save document' }

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/profile')
  return { success: true }
}

export async function submitRiderKycAction(input: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = riderKycSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid KYC data' }
  }

  const { bvn, nin } = parsed.data

  const { error } = await supabase
    .from('riders')
    .update({ bvn, nin, kyc_status: 'submitted' })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to save KYC information' }

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
