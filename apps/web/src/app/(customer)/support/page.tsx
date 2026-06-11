import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@sendit/utils'
import Link from 'next/link'
import { NewTicketForm } from '@/components/customer/new-ticket-form'
import { FaqAccordion } from '@/components/customer/faq-accordion'

export const metadata: Metadata = { title: 'Support' }

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const CATEGORY_LABELS: Record<string, string> = {
  order_issue: 'Order Issue',
  payment: 'Payment',
  account: 'Account',
  technical: 'Technical',
  other: 'Other',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: tickets }, { data: recentOrders }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, category, subject, status, created_at, updated_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('orders')
      .select('id, reference, status, created_at')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500 mt-1">Get help with your orders and account</p>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Common Questions</h2>
        <FaqAccordion />
      </div>

      {/* New ticket */}
      <NewTicketForm orders={recentOrders ?? []} userId={user!.id} />

      {/* Existing tickets */}
      {(tickets?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Your Tickets</h2>
          <div className="space-y-2">
            {tickets?.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{ticket.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {CATEGORY_LABELS[ticket.category]} · {formatRelativeTime(ticket.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty tickets state */}
      {(tickets?.length ?? 0) === 0 && (
        <div className="mt-4 text-center py-8">
          <p className="text-xs text-gray-400">No support tickets yet. We&apos;re here if you need us.</p>
        </div>
      )}
    </div>
  )
}
