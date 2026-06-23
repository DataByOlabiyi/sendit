'use client'

import { useState } from 'react'
import { formatDate, formatCurrency } from '@sendit/utils'
import { Pagination } from '@/components/ui/pagination'

interface DisputeRow {
  id: string
  type: string
  description: string
  status: string
  resolution: string | null
  refund_amount: number | null
  created_at: string
  resolved_at: string | null
  orders: { reference: string | null; total_fee: number } | { reference: string | null; total_fee: number }[] | null
  users: { full_name: string; email: string } | { full_name: string; email: string }[] | null
}

interface ResolveState {
  disputeId: string
  resolution: string
  refundAmount: string
  action: 'resolve' | 'reject' | 'review'
}

const statusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const typeLabels: Record<string, string> = {
  missing_item: 'Missing Item',
  damaged_item: 'Damaged Item',
  wrong_delivery: 'Wrong Delivery',
  late_delivery: 'Late Delivery',
  rider_conduct: 'Rider Conduct',
  overcharge: 'Overcharge',
  other: 'Other',
}

export function DisputesTable({ disputes: initialDisputes }: { disputes: DisputeRow[] }) {
  const [disputes, setDisputes] = useState(initialDisputes)
  const [resolveModal, setResolveModal] = useState<ResolveState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  function getUser(row: DisputeRow) {
    if (!row.users) return null
    return Array.isArray(row.users) ? row.users[0] : row.users
  }

  function getOrder(row: DisputeRow) {
    if (!row.orders) return null
    return Array.isArray(row.orders) ? row.orders[0] : row.orders
  }

  const filtered = statusFilter === 'all'
    ? disputes
    : disputes.filter((d) => d.status === statusFilter)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleFilter(val: string) { setStatusFilter(val); setPage(1) }

  async function handleStatusUpdate() {
    if (!resolveModal) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId: resolveModal.disputeId,
          action: resolveModal.action,
          resolution: resolveModal.resolution,
          refundAmount: resolveModal.refundAmount ? parseInt(resolveModal.refundAmount, 10) * 100 : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }

      const newStatus = resolveModal.action === 'resolve' ? 'resolved'
        : resolveModal.action === 'reject' ? 'rejected'
        : 'under_review'

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === resolveModal.disputeId
            ? { ...d, status: newStatus, resolution: resolveModal.resolution }
            : d,
        ),
      )
      setResolveModal(null)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['all', 'open', 'under_review', 'resolved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => handleFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition capitalize ${
              statusFilter === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Order</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Filed</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-400">No disputes</td>
                </tr>
              ) : (
                paginated.map((dispute) => {
                  const user = getUser(dispute)
                  const order = getOrder(dispute)
                  return (
                    <tr key={dispute.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{user?.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-mono text-gray-600">{order?.reference ?? '—'}</p>
                        {order?.total_fee && (
                          <p className="text-xs text-gray-400">
                            {formatCurrency(order.total_fee / 100)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">{typeLabels[dispute.type] ?? dispute.type}</p>
                        <p className="text-xs text-gray-400 max-w-[180px] truncate">{dispute.description}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[dispute.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {dispute.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{formatDate(dispute.created_at)}</td>
                      <td className="px-5 py-4">
                        {['open', 'under_review'].includes(dispute.status) && (
                          <div className="flex gap-1.5 flex-wrap">
                            {dispute.status === 'open' && (
                              <button
                                onClick={() => setResolveModal({ disputeId: dispute.id, resolution: '', refundAmount: '', action: 'review' })}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Review
                              </button>
                            )}
                            <button
                              onClick={() => setResolveModal({ disputeId: dispute.id, resolution: '', refundAmount: '', action: 'resolve' })}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => setResolveModal({ disputeId: dispute.id, resolution: '', refundAmount: '', action: 'reject' })}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {['resolved', 'rejected'].includes(dispute.status) && dispute.resolution && (
                          <p className="text-xs text-gray-400 max-w-[160px] truncate">{dispute.resolution}</p>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        noun="disputes"
      />

      {/* Resolution modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4 capitalize">
              {resolveModal.action === 'review' ? 'Mark as Under Review'
                : resolveModal.action === 'resolve' ? 'Resolve Dispute'
                : 'Reject Dispute'}
            </h3>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {resolveModal.action === 'review' ? 'Internal note (optional)' : 'Resolution note'}
            </label>
            <textarea
              value={resolveModal.resolution}
              onChange={(e) => setResolveModal((s) => s ? { ...s, resolution: e.target.value } : s)}
              rows={3}
              placeholder={resolveModal.action === 'resolve'
                ? 'Explain how this was resolved...'
                : resolveModal.action === 'reject'
                ? 'Reason for rejection...'
                : 'Notes for internal tracking...'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3 resize-none"
            />
            {resolveModal.action === 'resolve' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Refund amount (₦) — leave blank for no refund</label>
                <input
                  type="number"
                  value={resolveModal.refundAmount}
                  onChange={(e) => setResolveModal((s) => s ? { ...s, refundAmount: e.target.value } : s)}
                  placeholder="0"
                  min={0}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setResolveModal(null); setError(null) }}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={submitting}
                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition disabled:opacity-60 ${
                  resolveModal.action === 'reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {submitting ? '...' : resolveModal.action === 'review' ? 'Mark Under Review' : resolveModal.action === 'resolve' ? 'Resolve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
