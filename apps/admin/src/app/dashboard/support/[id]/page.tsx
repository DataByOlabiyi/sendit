import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatRelativeTime } from '@sendit/utils'
import { AdminTicketActions } from '@/components/support/admin-ticket-actions'

export const metadata: Metadata = { title: 'Support Ticket' }

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select(`id, category, subject, description, status, created_at, resolved_at, users!user_id(full_name, email)`)
      .eq('id', id)
      .single(),
    supabase
      .from('ticket_messages')
      .select(`id, message, is_staff, created_at, users!sender_id(full_name)`)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!ticket) notFound()

  const customer = ticket.users as unknown as { full_name: string; email: string } | null

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <a href="/dashboard/support" className="text-sm text-orange-600 hover:text-orange-700 transition mb-3 inline-block">
          ← Back to tickets
        </a>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {customer?.full_name} · {customer?.email} · Opened {formatDate(ticket.created_at)}
            </p>
          </div>
          <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Original description */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Original request</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Messages */}
      <div className="space-y-3 mb-4">
        {messages?.map((msg) => {
          const sender = msg.users as unknown as { full_name: string } | null
          return (
            <div
              key={msg.id}
              className={`rounded-2xl p-4 ${msg.is_staff ? 'bg-orange-50 border border-orange-100 ml-8' : 'bg-white border border-gray-100 mr-8'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  {msg.is_staff ? '🛡 Support Staff' : sender?.full_name ?? 'Customer'}
                </span>
                <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
            </div>
          )
        })}
      </div>

      {/* Admin actions */}
      {ticket.status !== 'closed' && (
        <AdminTicketActions ticketId={ticket.id} currentStatus={ticket.status} adminId={user!.id} />
      )}

      {ticket.status === 'closed' && (
        <div className="bg-gray-50 rounded-2xl p-4 text-center text-sm text-gray-400 border border-gray-100">
          This ticket is closed
        </div>
      )}
    </div>
  )
}
