'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveRiderAction, suspendRiderAction, rejectRiderAction } from '@/app/dashboard/riders/actions'

interface RiderActionsProps {
  riderId: string
  currentStatus: string
}

export function RiderActions({ riderId, currentStatus }: RiderActionsProps) {
  const [modal, setModal] = useState<'suspend' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (currentStatus === 'banned') {
    return (
      <p className="text-sm text-gray-400">
        No account actions available — this rider is permanently banned via KYC Review.
      </p>
    )
  }

  async function handleApprove() {
    setLoading(true)
    try {
      const result = await approveRiderAction(riderId)
      if (result.error) toast.error(result.error)
      else { toast.success('Rider approved'); router.refresh() }
    } finally {
      setLoading(false)
    }
  }

  function openModal(type: 'suspend' | 'reject') {
    setReason('')
    setModal(type)
  }

  async function handleModalSubmit() {
    if (!modal || !reason.trim()) { toast.error('Please provide a reason'); return }
    setLoading(true)
    try {
      const result =
        modal === 'suspend'
          ? await suspendRiderAction(riderId, reason.trim())
          : await rejectRiderAction(riderId, reason.trim())

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(modal === 'suspend' ? 'Rider suspended' : 'Rider rejected')
        setModal(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(currentStatus === 'pending' || currentStatus === 'suspended' || currentStatus === 'rejected' || currentStatus === 'needs_info') && (
          <button
            onClick={handleApprove}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition disabled:opacity-50"
          >
            {currentStatus === 'suspended' ? 'Reinstate' : 'Approve'}
          </button>
        )}
        {currentStatus === 'pending' && (
          <button
            onClick={() => openModal('reject')}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-50"
          >
            Reject
          </button>
        )}
        {currentStatus === 'approved' && (
          <button
            onClick={() => openModal('suspend')}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition disabled:opacity-50"
          >
            Suspend
          </button>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1 capitalize">{modal} Rider</h3>
            <p className="text-sm text-gray-500 mb-4">
              Provide a reason. This will be sent to the rider as a notification.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={`Reason for ${modal}...`}
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={loading}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={loading || !reason.trim()}
                className={`flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition disabled:opacity-50 ${
                  modal === 'suspend' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {loading ? 'Processing...' : modal === 'suspend' ? 'Suspend' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
