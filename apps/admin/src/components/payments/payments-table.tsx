'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@sendit/utils'
import { Pagination } from '@/components/ui/pagination'

interface PaymentRow {
  id: string
  amount: number
  status: string
  method: string
  paystack_reference: string | null
  paid_at: string | null
  created_at: string
  users: { full_name: string; email: string } | null
  orders: { pickup_address: string; delivery_address: string } | null
}

interface PaymentsTableProps {
  payments: PaymentRow[]
}

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
}

export function PaymentsTable({ payments: initialPayments }: PaymentsTableProps) {
  const [payments, setPayments] = useState(initialPayments)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  const filtered = payments.filter(
    (p) =>
      p.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.users?.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.paystack_reference ?? '').toLowerCase().includes(search.toLowerCase()),
  )
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleSearch(val: string) { setSearch(val); setPage(1) }

  async function handleRefund() {
    if (!refundTarget) return
    setRefunding(true)
    setRefundError(null)

    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: refundTarget.id, reason: refundReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRefundError(data.error ?? 'Refund failed')
        return
      }
      // Optimistically update status in local state
      setPayments((prev) =>
        prev.map((p) => (p.id === refundTarget.id ? { ...p, status: 'refunded' } : p)),
      )
      setRefundTarget(null)
      setRefundReason('')
    } catch {
      setRefundError('Network error — please try again')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by customer or reference..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Platform Cut</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Method</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Reference</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-sm text-gray-400">
                    No payments found
                  </td>
                </tr>
              ) : (
                paginated.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{payment.users?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{payment.users?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-orange-500">
                      {formatCurrency(payment.amount * 0.15)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 capitalize">{payment.method}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-mono text-gray-500">{payment.paystack_reference ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[payment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      {payment.status === 'paid' ? (
                        <button
                          onClick={() => { setRefundTarget(payment); setRefundError(null) }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium underline underline-offset-2 transition"
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
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
        noun="payments"
      />

      {/* Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Initiate Refund</h3>
            <p className="text-sm text-gray-500 mb-4">
              Refunding{' '}
              <span className="font-medium text-gray-700">{formatCurrency(refundTarget.amount)}</span>{' '}
              to <span className="font-medium text-gray-700">{refundTarget.users?.full_name ?? 'customer'}</span>.
              This action cannot be undone.
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Reason (optional)
            </label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Order never fulfilled, duplicate charge..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            {refundError && (
              <p className="text-xs text-red-600 mb-3">{refundError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setRefundTarget(null); setRefundReason(''); setRefundError(null) }}
                disabled={refunding}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition disabled:opacity-60"
              >
                {refunding ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
