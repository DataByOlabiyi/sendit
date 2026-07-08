'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

interface KycRider {
  id: string
  bvn: string | null
  nin: string | null
  kyc_status: string | null
  status: string
  vehicle_type: string
  created_at: string
  admin_question: string | null
  resubmission_note: string | null
  users: { full_name: string; email: string; phone: string | null } | null
}

interface KycTableProps {
  riders: KycRider[]
  readOnly?: boolean
}

type ActionType = 'request_changes' | 'reject' | 'ban'

const statusStyles: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700',
  needs_info: 'bg-blue-50 text-blue-700',
  approved:   'bg-green-50 text-green-700',
  rejected:   'bg-red-50 text-red-700',
  banned:     'bg-gray-900 text-white',
}

const statusLabels: Record<string, string> = {
  pending:    'Pending',
  needs_info: 'Needs Info',
  approved:   'Approved',
  rejected:   'Rejected',
  banned:     'Banned',
}

const modalConfig: Record<ActionType, { title: string; subtitle: string; placeholder: string; required: boolean; submitLabel: string; submitStyle: string }> = {
  request_changes: {
    title: 'Request more information',
    subtitle: 'Your message will be shown to the rider on their application screen.',
    placeholder: 'e.g. Please re-upload your license — the photo is too blurry to read.',
    required: true,
    submitLabel: 'Send Request',
    submitStyle: 'bg-orange-500 hover:bg-orange-600',
  },
  reject: {
    title: 'Reject application',
    subtitle: 'The reason will be shown to the rider. They may resubmit with updated information.',
    placeholder: 'e.g. BVN does not match the name provided.',
    required: false,
    submitLabel: 'Reject',
    submitStyle: 'bg-red-500 hover:bg-red-600',
  },
  ban: {
    title: 'Permanently ban rider',
    subtitle: 'This cannot be undone through the app. Reserve for confirmed fraud or repeated violations.',
    placeholder: 'Internal reason (for audit log only — not shown to rider).',
    required: true,
    submitLabel: 'Ban Rider',
    submitStyle: 'bg-gray-900 hover:bg-black',
  },
}

export function KycTable({ riders, readOnly = false }: KycTableProps) {
  const [rows, setRows] = useState(riders)
  const [actionTarget, setActionTarget] = useState<{ id: string; action: ActionType } | null>(null)
  const [reason, setReason] = useState('')
  const [banConfirm, setBanConfirm] = useState('')
  const [processing, setProcessing] = useState(false)

  function openModal(id: string, action: ActionType) {
    setActionTarget({ id, action })
    setReason('')
    setBanConfirm('')
  }

  function closeModal() {
    setActionTarget(null)
    setReason('')
    setBanConfirm('')
  }

  async function handleAction(riderId: string, action: string, actionReason?: string) {
    setProcessing(true)
    try {
      const res = await fetch('/api/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, action, reason: actionReason }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Action failed')
        return
      }

      const newStatus =
        action === 'approve'          ? 'approved'   :
        action === 'request_changes'  ? 'needs_info' :
        action === 'reject'           ? 'rejected'   : 'banned'

      setRows((prev) => prev.map((r) => r.id === riderId ? { ...r, status: newStatus } : r))

      const successMsg =
        action === 'approve'         ? 'Application approved'       :
        action === 'request_changes' ? 'Information request sent'   :
        action === 'reject'          ? 'Application rejected'       : 'Rider banned'

      toast.success(successMsg)
      closeModal()
    } finally {
      setProcessing(false)
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No records.</p>
  }

  const modal = actionTarget ? modalConfig[actionTarget.action] : null
  const isBanReady = actionTarget?.action === 'ban' ? banConfirm === 'BAN' : true
  const isReasonReady = modal ? (!modal.required || reason.trim().length > 0) : true
  const canSubmit = isBanReady && isReasonReady

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
              <tr key={rider.id} className="hover:bg-gray-50/50 align-top">
                <td className="px-5 py-4">
                  <Link href={`/dashboard/kyc/${rider.id}`} className="group block">
                    <p className="font-medium text-gray-900 group-hover:text-orange-500 transition">
                      {rider.users?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{rider.users?.email}</p>
                    {rider.users?.phone && <p className="text-xs text-gray-400">{rider.users.phone}</p>}
                  </Link>
                  {rider.admin_question && (
                    <p className="text-xs text-blue-600 mt-1.5 max-w-xs">
                      <span className="font-semibold">Admin asked:</span> {rider.admin_question}
                    </p>
                  )}
                  {rider.resubmission_note && (
                    <p className="text-xs text-orange-600 mt-1 max-w-xs">
                      <span className="font-semibold">Rider note:</span> {rider.resubmission_note}
                    </p>
                  )}
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
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[rider.status] ?? statusStyles.pending}`}>
                    {statusLabels[rider.status] ?? rider.status}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-5 py-4">
                    {rider.status !== 'approved' && rider.status !== 'banned' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAction(rider.id, 'approve')}
                            disabled={processing}
                            className="px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openModal(rider.id, 'request_changes')}
                            disabled={processing}
                            className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                          >
                            Request Changes
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openModal(rider.id, 'reject')}
                            disabled={processing}
                            className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => openModal(rider.id, 'ban')}
                            disabled={processing}
                            className="px-2.5 py-1.5 text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition disabled:opacity-50"
                          >
                            Ban
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action modal */}
      {actionTarget && modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{modal.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{modal.subtitle}</p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={modal.placeholder}
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />

            {actionTarget.action === 'ban' && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1.5">
                  Type <span className="font-mono font-bold text-gray-800">BAN</span> to confirm this permanent action
                </p>
                <input
                  type="text"
                  value={banConfirm}
                  onChange={(e) => setBanConfirm(e.target.value)}
                  placeholder="BAN"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(actionTarget.id, actionTarget.action, reason.trim() || undefined)}
                disabled={processing || !canSubmit}
                className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition disabled:opacity-50 ${modal.submitStyle}`}
              >
                {processing ? 'Processing...' : modal.submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
