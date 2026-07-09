import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await request.json()
  if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 })

  // Confirm this ticket genuinely belongs to the caller before alerting admins.
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, subject')
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')
  if (admins?.length) {
    const title = 'New Support Ticket'
    const body = ticket.subject
    const adminIds = admins.map((a) => a.id)

    await admin.from('notifications').insert(
      adminIds.map((userId) => ({ user_id: userId, type: 'system' as const, title, body, is_read: false })),
    )
    sendPushToUsers(admin, adminIds, { title, body, url: '/dashboard/support', tag: 'ticket-created' }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
