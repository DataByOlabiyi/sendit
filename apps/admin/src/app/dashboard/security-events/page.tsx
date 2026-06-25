import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@sendit/utils'

export const metadata: Metadata = { title: 'Security Events' }

const EVENT_COLORS: Record<string, string> = {
  'auth.login_success':               'bg-green-100 text-green-700',
  'auth.login_failure':               'bg-red-100 text-red-700',
  'auth.lockout':                     'bg-red-200 text-red-800',
  'auth.logout':                      'bg-gray-100 text-gray-600',
  'auth.register_success':            'bg-blue-100 text-blue-700',
  'auth.password_reset_requested':    'bg-yellow-100 text-yellow-700',
  'auth.password_reset_completed':    'bg-green-100 text-green-700',
  'auth.rate_limit_hit':              'bg-orange-100 text-orange-700',
  'auth.admin_login_success':         'bg-green-100 text-green-700',
  'auth.admin_login_failure':         'bg-red-100 text-red-700',
  'auth.admin_lockout':               'bg-red-200 text-red-800',
  'auth.admin_logout':                'bg-gray-100 text-gray-600',
  'auth.admin_mfa_enrolled':          'bg-blue-100 text-blue-700',
  'auth.admin_mfa_unenrolled':        'bg-yellow-100 text-yellow-700',
  'auth.admin_mfa_verified':          'bg-green-100 text-green-700',
  'auth.admin_rate_limit_hit':        'bg-orange-100 text-orange-700',
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default async function SecurityEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; page?: string; pageSize?: string; email?: string }>
}) {
  const { event, page, pageSize: pageSizeParam, email } = await searchParams
  const supabase = await createClient()
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const pageSize = PAGE_SIZE_OPTIONS.includes(parseInt(pageSizeParam ?? '', 10))
    ? parseInt(pageSizeParam!, 10)
    : 50
  const offset = (pageNum - 1) * pageSize

  let countQuery = supabase
    .from('auth_security_events')
    .select('*', { count: 'exact', head: true })
  if (event) countQuery = countQuery.eq('event', event)
  if (email) countQuery = countQuery.ilike('email', `%${email}%`)
  const { count } = await countQuery

  let query = supabase
    .from('auth_security_events')
    .select('id, event, email, user_id, ip_address, metadata, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  if (event) query = query.eq('event', event)
  if (email) query = query.ilike('email', `%${email}%`)

  const { data: entries } = await query

  const { data: distinctEvents } = await supabase
    .from('auth_security_events')
    .select('event')
    .order('event')
  const events = [...new Set(distinctEvents?.map((r) => r.event) ?? [])]

  const totalPages = count ? Math.ceil(count / pageSize) : null

  const criticalCount = entries?.filter(
    (e) => e.event.includes('lockout') || e.event.includes('rate_limit'),
  ).length ?? 0

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security Events</h1>
        <p className="text-sm text-gray-500 mt-1">Authentication events, lockouts, and rate-limit hits</p>
      </div>

      {criticalCount > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
          <p className="text-sm text-red-700 font-medium">
            {criticalCount} critical event{criticalCount !== 1 ? 's' : ''} on this page (lockouts / rate-limit hits)
          </p>
        </div>
      )}

      <form className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          name="event"
          defaultValue={event ?? ''}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <input
          name="email"
          defaultValue={email ?? ''}
          placeholder="Filter by email…"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
        />
        <select
          name="pageSize"
          defaultValue={pageSize}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s} per page</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition"
        >
          Apply
        </button>
        {(event || email || pageSize !== 50) && (
          <a
            href="/dashboard/security-events"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Reset
          </a>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Address</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Meta</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(entries?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No security events found
                  </td>
                </tr>
              )}
              {entries?.map((entry) => {
                const colorClass = EVENT_COLORS[entry.event] ?? 'bg-gray-100 text-gray-600'
                const isCritical = entry.event.includes('lockout') || entry.event.includes('rate_limit')
                return (
                  <tr
                    key={entry.id}
                    className={`transition ${isCritical ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {entry.event}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700 text-xs font-mono">{entry.email ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs font-mono">{entry.ip_address ?? '—'}</td>
                    <td className="px-5 py-3">
                      {entry.metadata ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-orange-600 hover:text-orange-700">View</summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 max-w-xs overflow-x-auto">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(entry.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {count != null
              ? `${offset + 1}–${Math.min(offset + (entries?.length ?? 0), count)} of ${count.toLocaleString()} events`
              : `Page ${pageNum}`}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <a
                href={`/dashboard/security-events?page=${pageNum - 1}${event ? `&event=${event}` : ''}${email ? `&email=${email}` : ''}&pageSize=${pageSize}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
              >
                Previous
              </a>
            )}
            {(totalPages == null || pageNum < totalPages) && (entries?.length ?? 0) === pageSize && (
              <a
                href={`/dashboard/security-events?page=${pageNum + 1}${event ? `&event=${event}` : ''}${email ? `&email=${email}` : ''}&pageSize=${pageSize}`}
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
