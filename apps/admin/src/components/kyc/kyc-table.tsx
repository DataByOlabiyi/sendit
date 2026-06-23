'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface KycRider {
  id: string
  bvn: string | null
  nin: string | null
  kyc_status: string | null
  vehicle_type: string
  created_at: string
  users: { full_name: string; email: string; phone: string | null } | null
}

interface KycTableProps {
  riders: KycRider[]
  readOnly?: boolean
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

export function KycTable({ riders, readOnly = false }: KycTableProps) {
  const [rows, setRows] = useState(riders)
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  async function handleAction(riderId: string, action: 'approve' | 'reject', reason?: string) {
    setProcessing(true)
    try {
      const res = await fetch('/api/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, action, reason }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Action failed')
        return
      }
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      setRows((prev) => prev.map((r) => r.id === riderId ? { ...r, kyc_status: newStatus } : r))
      toast.success(action === 'approve' ? 'KYC approved' : 'KYC rejected')
      setActionTarget(null)
      setRejectReason('')
    } finally {
      setProcessing(false)
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No records.</p>
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rider</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">BVN</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">NIN</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              {!readOnly && <th className="px-5 py-3.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((rider) => (
              <tr key={rider.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{rider.users?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{rider.users?.email}</p>
                  {rider.users?.phone && <p className="text-xs text-gray-400">{rider.users.phone}</p>}
                </td>
                <td className="px-5 py-4">
                  {rider.bvn ? (
                    <span className="font-mono text-xs text-gray-700">
                      {rider.bvn.slice(0, 3)}••••{rider.bvn.slice(-4)}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  {rider.nin ? (
                    <span className="font-mono text-xs text-gray-700">
                      {rider.nin.slice(0, 3)}••••{rider.nin.slice(-4)}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-4 capitalize text-gray-600">{rider.vehicle_type}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[rider.kyc_status ?? 'pending'] ?? statusStyles.pending}`}>
                    {rider.kyc_status ?? 'pending'}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-5 py-4">
                    {rider.kyc_status !== 'approved' && rider.kyc_status !== 'rejected' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(rider.id, 'approve')}
                          disabled={processing}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setActionTarget({ id: rider.id, action: 'reject' })}
                          disabled={processing}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject reason modal */}
      {actionTarget?.action === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Reject KYC submission</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason — it will be shown to the rider.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. BVN does not match the name provided"
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setActionTarget(null); setRejectReason('') }}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(actionTarget.id, 'reject', rejectReason.trim() || undefined)}
                disabled={processing}
                className="flex-1 py-2.5 text-sm text-white bg-red-500 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-60"
              >
                {processing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
