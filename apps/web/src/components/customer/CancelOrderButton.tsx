'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'
import { cancelOrderAction } from '@/app/(customer)/book/actions'

interface CancelOrderButtonProps {
  orderId: string
  isPaid: boolean
  totalFee: number
}

export function CancelOrderButton({ orderId, isPaid, totalFee }: CancelOrderButtonProps) {
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
      <div className="bg-white rounded-2xl border border-red-100 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Cancel this order?</p>
        <p className="text-xs text-gray-500 mb-4">
          {isPaid
            ? `A refund of ${formatCurrency(totalFee)} will be initiated. Funds typically arrive within 5–7 business days.`
            : 'Your order will be cancelled immediately.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition text-sm disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
          >
            {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
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
