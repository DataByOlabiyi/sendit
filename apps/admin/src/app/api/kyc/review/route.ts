import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { riderId, action, reason } = await request.json()
  if (!riderId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const { data: rider, error: fetchError } = await supabase
    .from('riders')
    .select('user_id')
    .eq('id', riderId)
    .single()

  if (fetchError || !rider) {
    return NextResponse.json({ error: 'Rider not found' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = { kyc_status: newStatus }
  if (action === 'reject' && reason) {
    updatePayload.rejection_reason = reason
  }

  const { error } = await supabase
    .from('riders')
    .update(updatePayload)
    .eq('id', riderId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  // Notify the rider
  const notificationBody = action === 'approve'
    ? 'Your identity verification (KYC) has been approved. Your account is fully verified.'
    : `Your identity verification was not approved. Reason: ${reason ?? 'Documents could not be verified'}. Please update your details and resubmit.`

  await supabase.from('notifications').insert({
    user_id: rider.user_id,
    type: 'system',
    title: action === 'approve' ? 'Identity Verified ✓' : 'KYC Review Failed',
    body: notificationBody,
    is_read: false,
  })

  await supabase.from('admin_audit_logs').insert({
    actor_id: user.id,
    action: `kyc.${action}`,
    target_type: 'rider',
    target_id: riderId,
    after_data: { reason: reason ?? null },
  })

  return NextResponse.json({ success: true })
}
