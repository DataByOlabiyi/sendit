'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ActionType = 'request_changes' | 'reject' | 'ban'

const modalConfig: Record<ActionType, {
  title: string
  subtitle: string
  placeholder: string
  required: boolean
  submitLabel: string
  submitStyle: string
}> = {
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

interface KycActionsProps {
  riderId: string
  currentStatus: string
}

export function KycActions({ riderId, currentStatus }: KycActionsProps) {
  const [actionTarget, setActionTarget] = useState<ActionType | null>(null)
  const [reason, setReason] = useState('')
  const [banConfirm, setBanConfirm] = useState('')
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  if (currentStatus === 'approved' || currentStatus === 'banned') {
    return (
      <p className="text-sm text-gray-400">
        No further actions available — this application is {currentStatus}.
      </p>
    )
  }

  function openModal(action: ActionType) {
    setActionTarget(action)
    setReason('')
    setBanConfirm('')
  }

  function closeModal() {
    setActionTarget(null)
    setReason('')
    setBanConfirm('')
  }

  async function handleAction(action: string, actionReason?: string) {
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

      const successMsg =
        action === 'approve'         ? 'Application approved'     :
        action === 'request_changes' ? 'Information request sent' :
        action === 'reject'          ? 'Application rejected'     : 'Rider banned'

      toast.success(successMsg)
      closeModal()
      router.refresh()
    } finally {
      setProcessing(false)
    }
  }

  const modal = actionTarget ? modalConfig[actionTarget] : null
  const isBanReady = actionTarget === 'ban' ? banConfirm === 'BAN' : true
  const isReasonReady = modal ? (!modal.required || reason.trim().length > 0) : true
  const canSubmit = isBanReady && isReasonReady

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleAction('approve')}
          disabled={processing}
          className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => openModal('request_changes')}
          disabled={processing}
          className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition disabled:opacity-50"
        >
          Request Changes
        </button>
        <button
          onClick={() => openModal('reject')}
          disabled={processing}
          className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => openModal('ban')}
          disabled={processing}
          className="px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition disabled:opacity-50"
        >
          Ban
        </button>
      </div>

      {actionTarget && modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{modal.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{modal.subtitle}</p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={modal.placeholder}
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />

            {actionTarget === 'ban' && (
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
                disabled={processing}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(actionTarget, reason.trim() || undefined)}
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
