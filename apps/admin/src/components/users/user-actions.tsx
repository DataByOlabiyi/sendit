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
  const router = useRouter()

  async function handleToggle() {
    setLoading(true)
    try {
      const result = isActive
        ? await suspendUserAction(userId)
        : await reactivateUserAction(userId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isActive ? 'Account suspended' : 'Account reactivated')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 text-sm font-semibold rounded-xl transition disabled:opacity-50 ${
        isActive
          ? 'text-red-600 bg-red-50 hover:bg-red-100'
          : 'text-green-700 bg-green-50 hover:bg-green-100'
      }`}
    >
      {loading ? 'Processing...' : isActive ? 'Suspend Account' : 'Reactivate Account'}
    </button>
  )
}
