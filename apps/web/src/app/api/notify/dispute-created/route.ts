import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { disputeId } = await request.json()
  if (!disputeId) return NextResponse.json({ error: 'disputeId required' }, { status: 400 })

  // Confirm this dispute genuinely belongs to the caller before alerting admins.
  const { data: dispute } = await supabase
    .from('disputes')
    .select('id, type')
    .eq('id', disputeId)
    .or(`customer_id.eq.${user.id},rider_id.eq.${user.id}`)
    .maybeSingle()

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')
  if (admins?.length) {
    const title = 'New Dispute Opened'
    const body = `A dispute (${dispute.type.replace(/_/g, ' ')}) was opened and needs review.`
    const adminIds = admins.map((a) => a.id)

    await admin.from('notifications').insert(
      adminIds.map((userId) => ({ user_id: userId, type: 'system' as const, title, body, is_read: false })),
    )
    sendPushToUsers(admin, adminIds, { title, body, url: '/dashboard/disputes', tag: 'dispute-created' }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
