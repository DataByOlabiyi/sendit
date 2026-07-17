'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { suspendUserAction, reactivateUserAction } from '@/app/dashboard/users/actions'

interface UserActionsProps {
  userId: string
  isActive: boolean
}

export function UserActions({ userId, isActive }: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const router = useRouter()

  async function handleReactivate() {
    setLoading(true)
    try {
      const result = await reactivateUserAction(userId)
      if (result.error) toast.error(result.error)
      else { toast.success('Account reactivated'); router.refresh() }
    } finally {
      setLoading(false)
    }
  }

  async function handleSuspend() {
    if (!reason.trim()) { toast.error('Please provide a reason'); return }
    setLoading(true)
    try {
      const result = await suspendUserAction(userId, reason.trim())
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Account suspended')
        setShowConfirm(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isActive) {
    return (
      <button
        onClick={handleReactivate}
        disabled={loading}
        className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Reactivate Account'}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => { setReason(''); setShowConfirm(true) }}
        disabled={loading}
        className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-50"
      >
        Suspend Account
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Suspend Account</h3>
            <p className="text-sm text-gray-500 mb-4">
              Provide a reason. This will be sent to the customer as a notification.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for suspension..."
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading || !reason.trim()}
                className="flex-1 py-2.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
