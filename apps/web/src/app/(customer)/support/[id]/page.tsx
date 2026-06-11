import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatRelativeTime } from '@sendit/utils'
import { CustomerTicketReply } from '@/components/customer/ticket-reply'

export const metadata: Metadata = { title: 'Support Ticket' }

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default async function CustomerTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, category, subject, description, status, created_at, resolved_at')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('ticket_messages')
      .select('id, message, is_staff, created_at, users!sender_id(full_name)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!ticket) notFound()

  const canReply = ticket.status !== 'closed' && ticket.status !== 'resolved'

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <a href="/support" className="text-sm text-orange-600 hover:text-orange-700 transition mb-4 inline-block">
        ← Back to support
      </a>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          <p className="text-sm text-gray-500 mt-1">Opened {formatDate(ticket.created_at)}</p>
        </div>
        <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </div>

      {/* Original description */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">Your request</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Thread */}
      <div className="space-y-3 mb-4">
        {messages?.map((msg) => {
          const sender = msg.users as unknown as { full_name: string } | null
          return (
            <div
              key={msg.id}
              className={`rounded-2xl p-4 ${
                msg.is_staff
                  ? 'bg-orange-50 border border-orange-100 mr-4'
                  : 'bg-white border border-gray-100 ml-4'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  {msg.is_staff ? '🛡 SendIt Support' : sender?.full_name ?? 'You'}
                </span>
                <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
            </div>
          )
        })}
      </div>

      {canReply && <CustomerTicketReply ticketId={ticket.id} userId={user!.id} />}

      {!canReply && (
        <div className="bg-gray-50 rounded-2xl p-4 text-center text-sm text-gray-400 border border-gray-100">
          {ticket.status === 'resolved' ? 'This ticket has been resolved.' : 'This ticket is closed.'}
        </div>
      )}
    </div>
  )
}
