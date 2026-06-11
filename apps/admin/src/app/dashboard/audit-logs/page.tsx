import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@sendit/utils'

export const metadata: Metadata = { title: 'Audit Logs' }

const ACTION_COLORS: Record<string, string> = {
  'payment.refund': 'bg-red-100 text-red-700',
  'payout.disburse': 'bg-green-100 text-green-700',
  'payout.fail': 'bg-orange-100 text-orange-700',
  'kyc.approve': 'bg-blue-100 text-blue-700',
  'kyc.reject': 'bg-red-100 text-red-700',
  'dispute.resolve': 'bg-purple-100 text-purple-700',
  'rider.approve': 'bg-green-100 text-green-700',
  'rider.suspend': 'bg-red-100 text-red-700',
  'pricing.update': 'bg-yellow-100 text-yellow-700',
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>
}) {
  const { action, page } = await searchParams
  const supabase = await createClient()
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const pageSize = 50
  const offset = (pageNum - 1) * pageSize

  let query = supabase
    .from('admin_audit_logs')
    .select(`
      id, action, target_type, target_id, before_data, after_data, ip_address, created_at,
      users!actor_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (action) query = query.eq('action', action)

  const { data: logs, count } = await supabase
    .from('admin_audit_logs')
    .select('action')
    .then(() => ({ data: null, count: null }))

  const { data: entries } = await query

  const { data: distinctActions } = await supabase
    .from('admin_audit_logs')
    .select('action')
    .order('action')

  const actions = [...new Set(distinctActions?.map((r) => r.action) ?? [])]

  return (
    <div className="px-6 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable record of all admin actions</p>
      </div>

      {/* Filters */}
      <form className="flex gap-3 mb-6 flex-wrap">
        <select
          name="action"
          defaultValue={action ?? ''}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition"
        >
          Filter
        </button>
        {action && (
          <a
            href="/dashboard/audit-logs"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Clear
          </a>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Changes</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(entries?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No audit log entries found</td>
                </tr>
              )}
              {entries?.map((log) => {
                const actor = log.users as unknown as { full_name: string; email: string } | null
                const colorClass = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                const hasChanges = log.before_data || log.after_data
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {log.target_type && (
                        <span className="text-xs text-gray-500 capitalize">{log.target_type}: </span>
                      )}
                      <span className="font-mono text-xs text-gray-700">{log.target_id?.slice(0, 8) ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{actor?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{actor?.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      {hasChanges ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-orange-600 hover:text-orange-700">View diff</summary>
                          <div className="mt-2 space-y-1">
                            {log.before_data && (
                              <div className="p-2 bg-red-50 rounded text-xs font-mono text-red-700 max-w-xs overflow-x-auto">
                                {JSON.stringify(log.before_data, null, 2)}
                              </div>
                            )}
                            {log.after_data && (
                              <div className="p-2 bg-green-50 rounded text-xs font-mono text-green-700 max-w-xs overflow-x-auto">
                                {JSON.stringify(log.after_data, null, 2)}
                              </div>
                            )}
                          </div>
                        </details>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Page {pageNum}</p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <a
                href={`/dashboard/audit-logs?page=${pageNum - 1}${action ? `&action=${action}` : ''}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
              >
                Previous
              </a>
            )}
            {(entries?.length ?? 0) === pageSize && (
              <a
                href={`/dashboard/audit-logs?page=${pageNum + 1}${action ? `&action=${action}` : ''}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
              >
                Next
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
