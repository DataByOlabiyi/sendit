import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_ACTIONS = ['approve', 'request_changes', 'reject', 'ban'] as const
type ReviewAction = (typeof VALID_ACTIONS)[number]

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

  if (!riderId || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if ((action === 'request_changes' || action === 'ban') && !reason?.trim()) {
    return NextResponse.json({ error: 'A reason is required for this action' }, { status: 400 })
  }

  const { data: rider, error: fetchError } = await supabase
    .from('riders')
    .select('user_id')
    .eq('id', riderId)
    .single()

  if (fetchError || !rider) {
    return NextResponse.json({ error: 'Rider not found' }, { status: 404 })
  }

  let updatePayload: Record<string, unknown>
  let notificationTitle: string
  let notificationBody: string

  switch (action as ReviewAction) {
    case 'approve':
      updatePayload = { status: 'approved', kyc_status: 'approved' }
      notificationTitle = 'Application Approved ✓'
      notificationBody = 'Your rider application has been approved. You can now start accepting deliveries!'
      break

    case 'request_changes':
      updatePayload = {
        status: 'needs_info',
        admin_question: reason.trim(),
        resubmission_note: null,
      }
      notificationTitle = 'Action Required on Your Application'
      notificationBody = `Our team needs more information before we can proceed: ${reason.trim()}`
      break

    case 'reject':
      updatePayload = {
        status: 'rejected',
        kyc_status: 'rejected',
        rejection_reason: reason?.trim() ?? null,
        admin_question: null,
      }
      notificationTitle = 'Application Not Approved'
      notificationBody = reason?.trim()
        ? `Your application was not approved. Reason: ${reason.trim()}. You may update your details and resubmit.`
        : 'Your application was not approved. You may update your details and resubmit.'
      break

    case 'ban':
      updatePayload = {
        status: 'banned',
        kyc_status: 'rejected',
        rejection_reason: reason.trim(),
        admin_question: null,
      }
      notificationTitle = 'Account Suspended'
      notificationBody = 'Your account has been permanently suspended following a review by our team.'
      break
  }

  const { error } = await supabase
    .from('riders')
    .update(updatePayload!)
    .eq('id', riderId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: rider.user_id,
    type: 'system',
    title: notificationTitle!,
    body: notificationBody!,
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
