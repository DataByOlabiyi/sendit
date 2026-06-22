'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCurrency, calculatePricing, haversineDistance } from '@sendit/utils'
import { createOrderAction } from '@/app/(customer)/book/actions'
import { initializePaystackPayment, generatePaystackReference } from '@/lib/paystack'
import { createClient } from '@/lib/supabase/client'
import type { BookingData } from './booking-flow'
import type { PackageSize, PricingEstimate } from '@sendit/types'

interface StepConfirmProps {
  data: BookingData
  onBack: () => void
  onSuccess?: () => void
}

const PAYSTACK_OPTION = { value: 'paystack', label: 'Pay with Card / Bank', icon: '💳' }

function clientFallbackPricing(data: BookingData): PricingEstimate {
  const distanceKm =
    data.pickup_lat && data.pickup_lng && data.delivery_lat && data.delivery_lng
      ? haversineDistance(data.pickup_lat, data.pickup_lng, data.delivery_lat, data.delivery_lng)
      : 5
  return calculatePricing(
    distanceKm,
    (data.package_size ?? 'small') as PackageSize,
    data.has_insurance ?? false,
    Math.ceil(distanceKm * 4)
  )
}

export function StepConfirm({ data, onBack, onSuccess }: StepConfirmProps) {
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet'>('paystack')
  const [isLoading, setIsLoading] = useState(false)
  const [pricing, setPricing] = useState<PricingEstimate>(() => clientFallbackPricing(data))
  const [isPricingLoading, setIsPricingLoading] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoId, setPromoId] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function fetchPricing() {
      if (!data.pickup_lat || !data.pickup_lng || !data.delivery_lat || !data.delivery_lng) {
        setPricing(clientFallbackPricing(data))
        setIsPricingLoading(false)
        return
      }

      setIsPricingLoading(true)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/pricing`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              pickup_lat: data.pickup_lat,
              pickup_lng: data.pickup_lng,
              delivery_lat: data.delivery_lat,
              delivery_lng: data.delivery_lng,
              package_size: data.package_size ?? 'small',
              has_insurance: data.has_insurance ?? false,
            }),
          }
        )
        if (res.ok) {
          setPricing(await res.json())
        }
      } catch {
        // Edge Function unavailable — fall back to client-side calculation
      } finally {
        setIsPricingLoading(false)
      }
    }
    fetchPricing()
  }, [
    data.pickup_lat,
    data.pickup_lng,
    data.delivery_lat,
    data.delivery_lng,
    data.package_size,
    data.has_insurance,
  ])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('customer_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setWalletBalance(data?.balance ?? 0))
    })
  }, [])

  async function handleApplyPromo() {
    if (!promoCode.trim()) return
    setValidatingPromo(true)
    setPromoError(null)
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase(), orderTotal: pricing.total_fee }),
      })
      const result = await res.json()
      if (!res.ok) { setPromoError(result.error ?? 'Invalid promo code'); return }
      setPromoDiscount(result.discount)
      setPromoId(result.promoId)
      toast.success(`Promo applied — saving ${formatCurrency(result.discount)}!`)
    } catch {
      setPromoError('Could not validate promo code')
    } finally {
      setValidatingPromo(false)
    }
  }

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
        delivery_landmark: data.delivery_landmark,
        package_description: data.package_description,
        package_size: data.package_size as PackageSize,
        package_weight: data.package_weight,
        is_fragile: data.is_fragile ?? false,
        has_insurance: data.has_insurance ?? false,
        special_instructions: data.special_instructions,
        payment_method: paymentMethod,
        is_scheduled: data.is_scheduled ?? false,
        scheduled_pickup_at: data.scheduled_pickup_at,
        preferred_time_slot: data.preferred_time_slot,
        promo_id: promoId ?? undefined,
        promo_discount: promoDiscount > 0 ? promoDiscount : undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      if (!result.orderId) {
        toast.error('Order creation failed. Please try again.')
        setIsLoading(false)
        return
      }

      // Wallet payment — order is already marked as paid by the server action
      if (paymentMethod === 'wallet') {
        toast.success('Order placed and paid from wallet!')
        onSuccess?.()
        router.push(`/orders/${result.orderId}`)
        return
      }

      // Paystack payment — totalFee already has promo discount applied by the server action
      const payableAmount = result.totalFee ?? 0
      if (result.totalFee) {
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
          amount: payableAmount,
          reference,
          metadata: { orderId: result.orderId },
          onSuccess: async (ref) => {
            const verifyRes = await fetch('/api/paystack/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: ref, orderId: result.orderId }),
            })

            if (verifyRes.ok) {
              toast.success('Payment successful! Order placed.')
              onSuccess?.()
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
          {promoDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promo discount</span>
              <span>-{formatCurrency(promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-base">
            <span className="text-gray-900">Total</span>
            <span className="text-orange-500">{formatCurrency(Math.max(0, pricing.total_fee - promoDiscount))}</span>
          </div>
        </div>
      </div>

      {/* Promo code */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Promo Code</h2>
        {promoId ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <span className="text-green-600 text-sm font-medium">✓ {promoCode.toUpperCase()} applied</span>
            <button
              type="button"
              onClick={() => { setPromoId(null); setPromoDiscount(0); setPromoCode(''); setPromoError(null) }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value); setPromoError(null) }}
              placeholder="Enter promo code"
              className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase placeholder:normal-case"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={validatingPromo || !promoCode.trim()}
              className="px-4 py-2.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition disabled:opacity-50"
            >
              {validatingPromo ? '...' : 'Apply'}
            </button>
          </div>
        )}
        {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Payment Method</h2>
        <div className="space-y-3">
          {/* Card / Bank */}
          <button
            type="button"
            onClick={() => setPaymentMethod('paystack')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
              paymentMethod === 'paystack' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-xl">{PAYSTACK_OPTION.icon}</span>
            <span className={`text-sm font-medium ${paymentMethod === 'paystack' ? 'text-orange-600' : 'text-gray-700'}`}>
              {PAYSTACK_OPTION.label}
            </span>
          </button>

          {/* Wallet */}
          {walletBalance > 0 ? (
            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              disabled={walletBalance < Math.max(0, pricing.total_fee - promoDiscount)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                paymentMethod === 'wallet'
                  ? 'border-orange-500 bg-orange-50'
                  : walletBalance < Math.max(0, pricing.total_fee - promoDiscount)
                  ? 'border-gray-200 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">👛</span>
              <div className="flex-1 text-left">
                <span className={`text-sm font-medium ${paymentMethod === 'wallet' ? 'text-orange-600' : 'text-gray-700'}`}>
                  SendIt Wallet
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Balance: {walletBalance >= Math.max(0, pricing.total_fee - promoDiscount)
                    ? `₦${walletBalance.toLocaleString()} — sufficient`
                    : `₦${walletBalance.toLocaleString()} — insufficient`}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 opacity-50 cursor-not-allowed select-none">
              <span className="text-xl">👛</span>
              <div className="flex-1 text-left">
                <span className="text-sm font-medium text-gray-500">SendIt Wallet</span>
                <p className="text-xs text-gray-400 mt-0.5">No balance — top up in Profile</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-24 lg:static -mx-4 px-4 lg:mx-0 lg:px-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 lg:pt-0 lg:pb-0 lg:bg-none z-10">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 py-3.5 border border-gray-200 bg-white text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition disabled:opacity-60"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isPricingLoading}
            className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-2xl transition shadow-lg shadow-orange-100 lg:shadow-none"
          >
            {isLoading ? 'Processing…' : isPricingLoading ? 'Calculating…' : `Pay ${formatCurrency(Math.max(0, pricing.total_fee - promoDiscount))}`}
          </button>
        </div>
      </div>
    </div>
  )
}
