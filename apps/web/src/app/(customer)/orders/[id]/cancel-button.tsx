'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cancelOrderAction } from '@/app/(customer)/book/actions'

interface CancelButtonProps {
  orderId: string
}

export function CancelButton({ orderId }: CancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    setIsLoading(true)
    try {
      const result = await cancelOrderAction(orderId, 'Cancelled by customer')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Order cancelled')
        router.refresh()
      }
    } catch {
      toast.error('Failed to cancel order')
    } finally {
      setIsLoading(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition text-sm"
        >
          Keep Order
        </button>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-2xl transition text-sm"
        >
          {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="w-full py-3 border border-red-200 text-red-500 hover:bg-red-50 font-semibold rounded-2xl transition text-sm"
    >
      Cancel Order
    </button>
  )
}
