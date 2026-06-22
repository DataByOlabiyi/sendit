'use client'

import { useState } from 'react'

interface Attempt {
  id: string
  outcome: string
  notes: string | null
  photo_url: string | null
  attempted_at: string
  orders: {
    id: string
    reference: string | null
    pickup_address: string
    delivery_address: string
    status: string
    users: { full_name: string; email: string; phone: string | null } | null
  } | null
  riders: {
    id: string
    vehicle_type: string
    vehicle_plate: string
    users: { full_name: string; phone: string | null } | null
  } | null
}

const outcomeConfig: Record<string, { label: string; color: string }> = {
  success: { label: 'Success', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  no_answer: { label: 'No Answer', color: 'bg-orange-100 text-orange-700' },
  wrong_address: { label: 'Wrong Address', color: 'bg-yellow-100 text-yellow-700' },
  refused: { label: 'Refused', color: 'bg-pink-100 text-pink-700' },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function DeliveryAttemptsTable({ attempts: initial }: { attempts: Attempt[] }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = initial.filter((a) => {
    const matchesFilter = filter === 'all' || a.outcome === filter
    const matchesSearch =
      !search ||
      (a.orders?.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.orders?.users?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.riders?.users?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order ref or name..."
          className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'success', 'failed', 'no_answer', 'wrong_address', 'refused'].map((o) => (
            <button
              key={o}
              onClick={() => setFilter(o)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition ${
                filter === o
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
              }`}
            >
              {o === 'all' ? 'All' : o.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Order</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Rider</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Outcome</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Attempted</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-400">No attempts found</td>
                </tr>
              ) : (
                filtered.map((attempt) => {
                  const cfg = outcomeConfig[attempt.outcome]
                  return (
                    <>
                      <tr key={attempt.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4">
                          <p className="text-xs font-mono font-medium text-gray-800">
                            {attempt.orders?.reference ?? attempt.orders?.id?.slice(0, 8).toUpperCase() ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">
                            {attempt.orders?.delivery_address}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-900">{attempt.orders?.users?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{attempt.orders?.users?.phone ?? ''}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-900">{attempt.riders?.users?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-400 capitalize">{attempt.riders?.vehicle_type} · {attempt.riders?.vehicle_plate}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            {cfg?.label ?? attempt.outcome}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{fmtDate(attempt.attempted_at)}</td>
                        <td className="px-5 py-4">
                          {(attempt.notes || attempt.photo_url) && (
                            <button
                              onClick={() => setExpanded(expanded === attempt.id ? null : attempt.id)}
                              className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                            >
                              {expanded === attempt.id ? 'Hide' : 'View'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded === attempt.id && (
                        <tr key={`${attempt.id}-exp`} className="bg-gray-50/60">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex gap-6">
                              {attempt.notes && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Rider Notes</p>
                                  <p className="text-sm text-gray-600 max-w-md">{attempt.notes}</p>
                                </div>
                              )}
                              {attempt.photo_url && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Attempt Photo</p>
                                  <img
                                    src={attempt.photo_url}
                                    alt="Delivery attempt"
                                    className="w-32 h-24 object-cover rounded-xl border border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
