'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'
import { calculatePricing, haversineDistance } from '@sendit/utils'
import { createOrderAction } from '@/app/(customer)/book/actions'
import { initializePaystackPayment, generatePaystackReference } from '@/lib/paystack'
import { createClient } from '@/lib/supabase/client'
import type { BookingData } from './booking-flow'
import type { PackageSize } from '@sendit/types'

interface StepConfirmProps {
  data: BookingData
  onBack: () => void
}

const paymentOptions = [
  { value: 'paystack', label: 'Pay with Card', icon: '💳' },
  { value: 'cash', label: 'Pay with Cash', icon: '💵' },
]

export function StepConfirm({ data, onBack }: StepConfirmProps) {
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'cash'>('paystack')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const distanceKm = data.pickup_lat && data.pickup_lng && data.delivery_lat && data.delivery_lng
    ? haversineDistance(data.pickup_lat, data.pickup_lng, data.delivery_lat, data.delivery_lng)
    : 5

  const durationMin = Math.ceil(distanceKm * 4)

  const pricing = calculatePricing(
    distanceKm,
    (data.package_size ?? 'small') as PackageSize,
    data.has_insurance ?? false,
    durationMin
  )

  async function handleConfirm() {
    if (!data.pickup_address || !data.delivery_address || !data.package_description || !data.package_size) {
      toast.error('Please complete all booking steps first')
      return
    }

    setIsLoading(true)

    try {
      const result = await createOrderAction({
        pickup_address: data.pickup_address,
        pickup_lat: data.pickup_lat ?? 6.5244,
        pickup_lng: data.pickup_lng ?? 3.3792,
        delivery_address: data.delivery_address,
        delivery_lat: data.delivery_lat ?? 6.5244,
        delivery_lng: data.delivery_lng ?? 3.3792,
        package_description: data.package_description,
        package_size: data.package_size as PackageSize,
        package_weight: data.package_weight,
        is_fragile: data.is_fragile ?? false,
        has_insurance: data.has_insurance ?? false,
        special_instructions: data.special_instructions,
        payment_method: paymentMethod,
      })

      if (result?.error) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      if (paymentMethod === 'cash') {
        toast.success('Order placed successfully!')
        router.push(`/orders/${result.orderId}`)
        return
      }

      // Paystack payment
      if (result.orderId && result.totalFee) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase.from('users').select('email').eq('id', user!.id).single()

        const reference = generatePaystackReference(result.orderId)

        // Initialize payment record on server
        await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: result.orderId,
            amount: result.totalFee,
            reference,
          }),
        })

        await initializePaystackPayment({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
          email: profile?.email ?? '',
          amount: result.totalFee,
          reference,
          metadata: { orderId: result.orderId },
          onSuccess: async (ref) => {
            // Verify payment
            const verifyRes = await fetch('/api/paystack/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: ref, orderId: result.orderId }),
            })

            if (verifyRes.ok) {
              toast.success('Payment successful! Order placed.')
              router.push(`/orders/${result.orderId}`)
            } else {
              toast.error('Payment verification failed. Contact support.')
            }
          },
          onClose: () => {
            toast.info('Payment cancelled')
            setIsLoading(false)
          },
        })
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Route Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Route Summary</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">FROM</p>
              <p className="text-sm text-gray-700">{data.pickup_address}</p>
            </div>
          </div>
          <div className="ml-1 w-0.5 h-4 bg-gray-200" />
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">TO</p>
              <p className="text-sm text-gray-700">{data.delivery_address}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          <span>~{pricing.estimated_distance_km}km</span>
          <span>~{pricing.estimated_duration_min} min</span>
        </div>
      </div>

      {/* Package */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Package</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{data.package_description}</span>
          <span className="text-gray-500 capitalize">{data.package_size?.replace('_', ' ')}</span>
        </div>
        <div className="flex gap-3 mt-2">
          {data.is_fragile && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">⚠️ Fragile</span>}
          {data.has_insurance && <span className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded-lg">✅ Insured</span>}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Pricing</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Base fee</span>
            <span>{formatCurrency(pricing.base_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Distance ({pricing.estimated_distance_km}km)</span>
            <span>{formatCurrency(pricing.distance_fee)}</span>
          </div>
          {pricing.insurance_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Insurance</span>
              <span>{formatCurrency(pricing.insurance_fee)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-base">
            <span className="text-gray-900">Total</span>
            <span className="text-orange-500">{formatCurrency(pricing.total_fee)}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Payment Method</h2>
        <div className="grid grid-cols-2 gap-3">
          {paymentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPaymentMethod(option.value as 'paystack' | 'cash')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                paymentMethod === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{option.icon}</span>
              <span className={`text-sm font-medium ${paymentMethod === option.value ? 'text-orange-600' : 'text-gray-700'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-2xl transition"
        >
          {isLoading ? 'Processing...' : `Pay ${formatCurrency(pricing.total_fee)}`}
        </button>
      </div>
    </div>
  )
}
