'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@sendit/utils'

interface Claim {
  id: string
  claim_amount: number
  payout_amount: number | null
  status: string
  description: string
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
  orders: { id: string; reference: string | null; total_fee: number } | null
  users: { full_name: string; email: string } | null
}

interface ClaimsTableProps {
  claims: Claim[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const fmt = (kobo: number | null) => kobo != null ? formatCurrency(kobo / 100) : '—'

export function ClaimsTable({ claims: initial }: ClaimsTableProps) {
  const [claims, setClaims] = useState(initial)
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)

  const filtered = statusFilter === 'all' ? claims : claims.filter((c) => c.status === statusFilter)

  async function updateClaim(claimId: string, status: string, payoutAmount?: number, note?: string) {
    setProcessing(claimId)
    setError(null)
    try {
      const res = await fetch('/api/claims/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, status, payoutAmount, resolutionNote: note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Update failed'); return }
      setClaims((prev) => prev.map((c) =>
        c.id === claimId
          ? { ...c, status, payout_amount: payoutAmount ?? c.payout_amount, resolution_note: note ?? c.resolution_note }
          : c,
      ))
      setExpanded(null)
    } catch { setError('Network error') }
    finally { setProcessing(null) }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all', 'pending', 'under_review', 'approved', 'paid', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-2.5 min-h-[44px] rounded-full text-xs font-medium transition flex items-center ${
              statusFilter === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Mobile card view */}
      <div className="block lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">No claims found</p>
          </div>
        ) : (
          filtered.map((claim) => (
            <div key={claim.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{claim.users?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500 truncate">{claim.users?.email}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[claim.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {claim.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Order</span>
                  <span className="font-mono text-gray-600">{claim.orders?.reference ?? claim.orders?.id?.slice(0, 8).toUpperCase() ?? '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Claim Amount</span>
                  <span className="font-semibold text-gray-900">{fmt(claim.claim_amount)}</span>
                </div>
                {claim.payout_amount && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Payout</span>
                    <span className="font-semibold text-green-600">{fmt(claim.payout_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Filed</span>
                  <span className="text-gray-500">{formatDate(claim.created_at)}</span>
                </div>
              </div>
              {['pending', 'under_review', 'approved'].includes(claim.status) && (
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
                    className="w-full py-2.5 text-sm font-medium rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-100 transition"
                  >
                    {expanded === claim.id ? 'Close' : 'Review'}
                  </button>
                  {expanded === claim.id && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Customer Description</p>
                      <p className="text-sm text-gray-600 mb-3">{claim.description}</p>
                      <ClaimActionPanel
                        claim={claim}
                        isProcessing={processing === claim.id}
                        onUpdate={updateClaim}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Order</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Claim</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Filed</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No claims found</td></tr>
              ) : (
                filtered.map((claim) => (
                  <>
                    <tr key={claim.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{claim.users?.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{claim.users?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-mono text-gray-500">{claim.orders?.reference ?? claim.orders?.id?.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-400">Order: {fmt(claim.orders?.total_fee ? claim.orders.total_fee * 100 : null)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{fmt(claim.claim_amount)}</p>
                        {claim.payout_amount && (
                          <p className="text-xs text-green-600">Payout: {fmt(claim.payout_amount)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[claim.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {claim.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{formatDate(claim.created_at)}</td>
                      <td className="px-5 py-4">
                        {['pending', 'under_review', 'approved'].includes(claim.status) && (
                          <button
                            onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
                            className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                          >
                            {expanded === claim.id ? 'Close' : 'Review'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === claim.id && (
                      <tr key={`${claim.id}-expand`} className="bg-blue-50/40">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="space-y-3 max-w-2xl">
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Customer Description</p>
                              <p className="text-sm text-gray-600">{claim.description}</p>
                            </div>
                            <ClaimActionPanel
                              claim={claim}
                              isProcessing={processing === claim.id}
                              onUpdate={updateClaim}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ClaimActionPanel({
  claim,
  isProcessing,
  onUpdate,
}: {
  claim: Claim
  isProcessing: boolean
  onUpdate: (id: string, status: string, payout?: number, note?: string) => void
}) {
  const [payoutInput, setPayoutInput] = useState(claim.payout_amount ? String(claim.payout_amount / 100) : '')
  const [noteInput, setNoteInput] = useState(claim.resolution_note ?? '')

  return (
    <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Payout Amount (₦)</label>
          <input
            type="number"
            value={payoutInput}
            onChange={(e) => setPayoutInput(e.target.value)}
            placeholder="Enter payout in Naira"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Note</label>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Optional note to customer"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {claim.status === 'pending' && (
          <button
            onClick={() => onUpdate(claim.id, 'under_review', undefined, noteInput || undefined)}
            disabled={isProcessing}
            className="px-4 py-2 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium disabled:opacity-50"
          >
            Mark Under Review
          </button>
        )}
        {['pending', 'under_review'].includes(claim.status) && (
          <button
            onClick={() => onUpdate(
              claim.id, 'approved',
              payoutInput ? Math.round(parseFloat(payoutInput) * 100) : undefined,
              noteInput || undefined,
            )}
            disabled={isProcessing || !payoutInput}
            className="px-4 py-2 text-xs text-white bg-green-500 hover:bg-green-600 rounded-lg font-medium disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {claim.status === 'approved' && (
          <button
            onClick={() => onUpdate(claim.id, 'paid', claim.payout_amount ?? undefined, noteInput || undefined)}
            disabled={isProcessing}
            className="px-4 py-2 text-xs text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium disabled:opacity-50"
          >
            Mark as Paid
          </button>
        )}
        {['pending', 'under_review'].includes(claim.status) && (
          <button
            onClick={() => onUpdate(claim.id, 'rejected', undefined, noteInput || undefined)}
            disabled={isProcessing}
            className="px-4 py-2 text-xs text-red-600 border border-red-200 hover:bg-red-50 rounded-lg font-medium disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  )
}
