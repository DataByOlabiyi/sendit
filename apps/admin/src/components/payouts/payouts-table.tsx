'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@sendit/utils'

interface Rider {
  id: string
  bank_account_number: string | null
  bank_name: string | null
  bank_account_name: string | null
  paystack_recipient_code: string | null
  users: { full_name: string; email: string } | null
}

interface PayoutRow {
  id: string
  amount: number
  status: string
  initiated_at: string
  completed_at: string | null
  failure_reason: string | null
  riders: Rider | Rider[] | null
}

interface PayoutsTableProps {
  payouts: PayoutRow[]
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export function PayoutsTable({ payouts: initialPayouts }: PayoutsTableProps) {
  const [payouts, setPayouts] = useState(initialPayouts)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failModal, setFailModal] = useState<PayoutRow | null>(null)
  const [failReason, setFailReason] = useState('')

  function getRider(row: PayoutRow): Rider | null {
    if (!row.riders) return null
    return Array.isArray(row.riders) ? row.riders[0] ?? null : row.riders
  }

  async function handleDisburse(payout: PayoutRow) {
    setProcessing(payout.id)
    setError(null)
    try {
      const res = await fetch('/api/payouts/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: payout.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Disbursement failed')
        return
      }
      setPayouts((prev) =>
        prev.map((p) => (p.id === payout.id ? { ...p, status: 'processing' } : p)),
      )
    } catch {
      setError('Network error — try again')
    } finally {
      setProcessing(null)
    }
  }

  async function submitMarkFailed() {
    if (!failModal || !failReason.trim()) return
    const payout = failModal
    setFailModal(null)
    setProcessing(payout.id)
    try {
      const res = await fetch('/api/payouts/fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: payout.id, reason: failReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payout.id ? { ...p, status: 'failed', failure_reason: failReason.trim() } : p,
        ),
      )
    } catch {
      setError('Network error — try again')
    } finally {
      setProcessing(null)
      setFailReason('')
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Rider</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Bank</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Requested</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-400">No payout requests</td>
                </tr>
              ) : (
                payouts.map((payout) => {
                  const rider = getRider(payout)
                  const isActive = processing === payout.id
                  return (
                    <tr key={payout.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{rider?.users?.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{rider?.users?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">{rider?.bank_name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{rider?.bank_account_name}</p>
                        <p className="text-xs font-mono text-gray-400">{rider?.bank_account_number}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(payout.amount / 100)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[payout.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {payout.status}
                        </span>
                        {payout.failure_reason && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-[160px]">{payout.failure_reason}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {formatDate(payout.initiated_at)}
                      </td>
                      <td className="px-5 py-4">
                        {payout.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDisburse(payout)}
                              disabled={isActive}
                              className="text-xs text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                            >
                              {isActive ? '...' : 'Disburse'}
                            </button>
                            <button
                              onClick={() => { setFailReason(''); setFailModal(payout) }}
                              disabled={isActive}
                              className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            >
                              Fail
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
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

      {/* Mark failed modal */}
      {failModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Mark Payout as Failed</h3>
            <p className="text-xs text-gray-500 mb-4">
              {getRider(failModal)?.users?.full_name} · {formatCurrency(failModal.amount / 100)}
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Failure reason</label>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              rows={3}
              placeholder="e.g. Invalid bank account number"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setFailModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitMarkFailed}
                disabled={!failReason.trim()}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50"
              >
                Mark Failed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
