'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { initializePaystackPayment, generatePaystackReference } from '@/lib/paystack'
import { createClient } from '@/lib/supabase/client'

interface ResumePaymentButtonProps {
  orderId: string
  totalFee: number
  reference: string | null
}

export function ResumePaymentButton({ orderId, totalFee, reference }: ResumePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleResume() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
      if (!profile?.email) { toast.error('Could not load account details'); return }

      // Use existing reference or generate a new one
      const ref = reference ?? generatePaystackReference(orderId)

      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reference: ref }),
      })

      if (!initRes.ok) {
        const data = await initRes.json()
        toast.error(data.error ?? 'Failed to initialize payment')
        return
      }

      await initializePaystackPayment({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: profile.email,
        // totalFee (order.total_fee) is stored in NGN, same as the original
        // checkout flow in step-confirm.tsx — initializePaystackPayment
        // converts to kobo internally. Dividing here undercharges 100x.
        amount: totalFee,
        reference: ref,
        onSuccess: async (payRef) => {
          const verifyRes = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: payRef, orderId }),
          })
          if (verifyRes.ok) {
            toast.success('Payment confirmed!')
            router.refresh()
          } else {
            toast.error('Payment received but verification failed — contact support')
          }
        },
        onClose: () => toast('Payment window closed'),
      })
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
      <p className="text-sm font-semibold text-yellow-800 mb-1">Payment Incomplete</p>
      <p className="text-xs text-yellow-700 mb-3">
        Your booking is saved but payment hasn&apos;t been confirmed. Resume to keep your order.
      </p>
      <button
        onClick={handleResume}
        disabled={isLoading}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
      >
        {isLoading ? 'Loading...' : 'Resume Payment'}
      </button>
    </div>
  )
}
