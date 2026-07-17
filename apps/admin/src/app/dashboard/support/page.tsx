import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@sendit/utils'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Support Tickets' }

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS: Record<string, string> = {
  order_issue: 'Order Issue',
  payment: 'Payment',
  account: 'Account',
  technical: 'Technical',
  other: 'Other',
}

export default async function SupportTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const { status, category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('support_tickets')
    .select(`
      id, category, subject, status, created_at, updated_at,
      users!user_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)

  const [{ data: tickets }, { count: open }, { count: inProgress }] = await Promise.all([
    query,
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
  ])

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer and rider support requests</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex-1 text-center">
          <p className="text-2xl font-bold text-red-600">{open ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Open</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex-1 text-center">
          <p className="text-2xl font-bold text-blue-600">{inProgress ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex gap-3 mb-6 flex-wrap">
        <select
          name="status"
          defaultValue={status ?? ''}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          name="category"
          defaultValue={category ?? ''}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition">
          Filter
        </button>
        {(status || category) && (
          <Link href="/dashboard/support" className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(tickets?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No tickets found</td>
                </tr>
              )}
              {tickets?.map((ticket) => {
                const user = ticket.users as unknown as { full_name: string; email: string } | null
                return (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/support/${ticket.id}`} className="font-medium text-gray-900 hover:text-orange-600 transition">
                        {ticket.subject}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{ticket.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{user?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-600">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(ticket.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
