'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { riderProfileSchema, riderKycSchema } from '@sendit/validations'
import { notifyAdminsOfKycSubmission } from '@/lib/kyc-notify'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg':  'image/jpeg',
  'image/png':  'image/png',
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
  const admin = createAdminClient()
  const { data, error: uploadError } = await admin.storage
    .from('rider-documents')
    .upload(path, bytes, { contentType, upsert: false })

  if (uploadError) return { error: 'Upload failed. Please try again.' }

  return { path: data.path }
}

export async function createRiderProfileAction(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = riderProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid rider profile data' }
  }

  // All rider DB writes use the admin client — the regular server client's JWT
  // is not always forwarded to PostgREST, causing RLS to silently return 0 rows.
  // auth.getUser() above is the authentication gate; all queries are scoped to user.id.
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('riders')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'banned') return { error: 'Your account has been permanently suspended.' }
    if (existing.status !== 'rejected') return { error: 'Rider profile already exists' }

    const { error } = await admin
      .from('riders')
      .update({
        vehicle_type:      parsed.data.vehicle_type,
        vehicle_plate:     parsed.data.vehicle_plate,
        vehicle_model:     parsed.data.vehicle_model,
        license_number:    parsed.data.license_number,
        status:            'pending',
        rejection_reason:  null,
        resubmission_note: null,
        admin_question:    null,
      })
      .eq('user_id', user.id)
      .eq('status', 'rejected')

    if (error) return { error: 'Failed to resubmit rider profile' }

    revalidatePath('/rider/onboarding')
    revalidatePath('/rider/dashboard')
    return { success: true }
  }

  const { data: newRider, error } = await admin
    .from('riders')
    .insert({
      user_id:        user.id,
      vehicle_type:   parsed.data.vehicle_type,
      vehicle_plate:  parsed.data.vehicle_plate,
      vehicle_model:  parsed.data.vehicle_model,
      license_number: parsed.data.license_number,
      status:         'pending',
      is_online:      false,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'Rider profile already exists' }
    return { error: 'Failed to create rider profile' }
  }

  // Wallet row — trigger may also attempt this; ON CONFLICT makes both safe.
  await admin
    .from('rider_wallet')
    .upsert({ rider_id: newRider.id }, { onConflict: 'rider_id', ignoreDuplicates: true })

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function uploadRiderDocumentAction(docType: 'license' | 'vehicle', storagePath: string) {
  if (!['license', 'vehicle'].includes(docType)) return { error: 'Invalid document type' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!storagePath.startsWith(`${user.id}/`)) return { error: 'Invalid document path' }

  const column = docType === 'license' ? 'license_doc_url' : 'vehicle_doc_url'
  const admin = createAdminClient()
  const { error } = await admin
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
  const admin = createAdminClient()
  const { error } = await admin
    .from('riders')
    .update({ bvn, nin, kyc_status: 'submitted' })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to save KYC information' }

  const { data: profile } = await admin.from('users').select('full_name').eq('id', user.id).single()
  notifyAdminsOfKycSubmission(profile?.full_name ?? 'A rider').catch(console.error)

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/profile')
  return { success: true }
}

export async function toggleOnlineStatusAction(isOnline: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  if (!isOnline) {
    const { data: rider } = await admin
      .from('riders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (rider) {
      const { count } = await admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', rider.id)
        .in('status', ['accepted', 'picked_up', 'in_transit'])

      if ((count ?? 0) > 0) {
        return { error: 'You have an active delivery. Complete it before going offline.' }
      }
    }
  }

  const { error } = await admin
    .from('riders')
    .update({ is_online: isOnline })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update status' }

  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function respondToAdminKycRequestAction(input: {
  note?: string
  licenseStoragePath?: string
  vehicleStoragePath?: string
  bvn?: string
  nin?: string
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_model?: string
  license_number?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (input.bvn !== undefined && !/^\d{11}$/.test(input.bvn)) {
    return { error: 'BVN must be exactly 11 digits' }
  }
  if (input.nin !== undefined && !/^\d{11}$/.test(input.nin)) {
    return { error: 'NIN must be exactly 11 digits' }
  }

  const profileParsed = riderProfileSchema.safeParse({
    vehicle_type: input.vehicle_type,
    vehicle_plate: input.vehicle_plate,
    vehicle_model: input.vehicle_model,
    license_number: input.license_number,
  })
  if (!profileParsed.success) {
    return { error: profileParsed.error.issues[0]?.message ?? 'Invalid vehicle or license details' }
  }

  const admin = createAdminClient()

  const { data: rider } = await admin
    .from('riders')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!rider) return { error: 'Rider profile not found' }
  if (rider.status !== 'needs_info') return { error: 'No pending information request on your application' }

  const updatePayload: Record<string, unknown> = {
    status:            'pending',
    admin_question:    null,
    resubmission_note: input.note?.trim() || null,
    ...profileParsed.data,
  }

  if (input.licenseStoragePath) updatePayload.license_doc_url = input.licenseStoragePath
  if (input.vehicleStoragePath) updatePayload.vehicle_doc_url = input.vehicleStoragePath
  if (input.bvn) { updatePayload.bvn = input.bvn; updatePayload.kyc_status = 'submitted' }
  if (input.nin) { updatePayload.nin = input.nin; updatePayload.kyc_status = 'submitted' }

  const { error } = await admin
    .from('riders')
    .update(updatePayload)
    .eq('user_id', user.id)
    .eq('status', 'needs_info')

  if (error) {
    if (error.code === '23505') return { error: 'This BVN or NIN is already linked to another account' }
    return { error: 'Failed to submit your response' }
  }

  const { data: profile } = await admin.from('users').select('full_name').eq('id', user.id).single()
  notifyAdminsOfKycSubmission(profile?.full_name ?? 'A rider').catch(console.error)

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/dashboard')
  return { success: true }
}
