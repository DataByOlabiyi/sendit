'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCurrency, formatRelativeTime } from '@sendit/utils'
import { PRICING } from '@sendit/constants'
import { StatusBadge } from '@sendit/ui'
import {
  acceptOrderAction,
  updateOrderStatusAction,
  uploadProofOfDeliveryAction,
} from '@/app/rider/actions'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@sendit/types'

interface RiderOrderDetailProps {
  order: Order & { users?: { full_name: string; phone: string | null; email: string } }
  riderId: string
}

const nextStatus: Partial<Record<OrderStatus, { status: OrderStatus; label: string; color: string }>> = {
  accepted: { status: 'picked_up', label: 'Mark as Picked Up', color: 'bg-purple-500 hover:bg-purple-600' },
  picked_up: { status: 'in_transit', label: 'Start Delivery', color: 'bg-blue-500 hover:bg-blue-600' },
  in_transit: { status: 'delivered', label: 'Complete Delivery', color: 'bg-green-500 hover:bg-green-600' },
}

export function RiderOrderDetail({ order, riderId }: RiderOrderDetailProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [proofImage, setProofImage] = useState<File | null>(null)
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const router = useRouter()

  const isOwnOrder = order.rider_id === riderId
  const isPending = order.status === 'pending'
  const canAccept = isPending && !isOwnOrder
  const next = nextStatus[order.status as OrderStatus]

  // GPS tracking when in transit
  useEffect(() => {
    if (!isOwnOrder || !['accepted', 'picked_up', 'in_transit'].includes(order.status)) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    setIsTrackingLocation(true)
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        // Lightweight PATCH instead of Server Action — avoids Next.js RSC
        // overhead on every GPS ping
        fetch('/api/rider/location', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        }).catch(console.error)

        // Insert into order_tracking for breadcrumb history
        const supabase = createClient()
        await supabase.from('order_tracking').insert({
          order_id: order.id,
          rider_id: riderId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => console.error('GPS error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      setIsTrackingLocation(false)
    }
  }, [order.status, isOwnOrder, riderId, order.id])

  async function handleAccept() {
    setIsLoading(true)
    try {
      const result = await acceptOrderAction(order.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Order accepted!')
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateStatus() {
    if (!next) return
    setIsLoading(true)

    try {
      if (next.status === 'delivered') {
        if (!proofImage) {
          toast.error('Please upload proof of delivery photo')
          setIsLoading(false)
          return
        }

        // Upload image to Supabase Storage
        // Path format: {order_id}/{filename} — matches the storage policy which
        // uses (storage.foldername(name))[1] to scope access to order parties.
        const supabase = createClient()
        const fileName = `${order.id}/${Date.now()}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('proof-of-delivery')
          .upload(fileName, proofImage)

        if (uploadError) {
          toast.error('Failed to upload photo')
          setIsLoading(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('proof-of-delivery')
          .getPublicUrl(uploadData.path)

        const result = await uploadProofOfDeliveryAction(order.id, publicUrl)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Delivery completed! 🎉')
          router.refresh()
        }
      } else {
        const result = await updateOrderStatusAction(order.id, next.status)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`Status updated to ${next.status.replace('_', ' ')}`)
          router.refresh()
        }
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <Link href="/rider/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Delivery Details</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          {isTrackingLocation && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Tracking
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Earnings preview */}
      {(isPending || isOwnOrder) && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Your earnings</p>
            <p className="text-xl font-bold text-orange-500">{formatCurrency(order.total_fee * (1 - PRICING.PLATFORM_COMMISSION))}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{Math.round((1 - PRICING.PLATFORM_COMMISSION) * 100)}% of {formatCurrency(order.total_fee)}</p>
        </div>
      )}

      {/* Customer info */}
      {isOwnOrder && order.users && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{order.users.full_name}</p>
              <p className="text-xs text-gray-500">{order.users.phone ?? order.users.email}</p>
            </div>
            {order.users.phone && (
              <a
                href={`tel:${order.users.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </a>
            )}
          </div>
        </div>
      )}

      {/* Route */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Route</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">PICKUP</p>
              <p className="text-sm text-gray-700">{order.pickup_address}</p>
              <a
                href={`https://maps.google.com/?q=${order.pickup_lat},${order.pickup_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-500 hover:text-orange-600 mt-0.5 inline-block"
              >
                Open in Maps →
              </a>
            </div>
          </div>
          <div className="ml-1 w-0.5 h-4 bg-gray-200" />
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">DELIVERY</p>
              <p className="text-sm text-gray-700">{order.delivery_address}</p>
              <a
                href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-500 hover:text-orange-600 mt-0.5 inline-block"
              >
                Open in Maps →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Package */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Package</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Description</p>
            <p className="text-gray-700 mt-0.5">{order.package_description}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Size</p>
            <p className="text-gray-700 mt-0.5 capitalize">{order.package_size.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {order.is_fragile && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">⚠️ Handle with care</span>}
          {order.has_insurance && <span className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded-lg">✓ Insured</span>}
        </div>
        {order.special_instructions && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Instructions</p>
            <p className="text-sm text-gray-700 mt-0.5">{order.special_instructions}</p>
          </div>
        )}
      </div>

      {/* Proof of delivery upload */}
      {isOwnOrder && order.status === 'in_transit' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Proof of Delivery</h2>
          <p className="text-xs text-gray-500 mb-3">Take a clear photo of the delivered package or recipient</p>
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setProofImage(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {proofImage ? (
              <div className="rounded-xl overflow-hidden border-2 border-green-400">
                <img
                  src={URL.createObjectURL(proofImage)}
                  alt="Proof of delivery preview"
                  className="w-full max-h-64 object-cover"
                />
                <div className="bg-green-50 px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700">✓ Photo ready</p>
                    <p className="text-xs text-gray-500 truncate max-w-48">{proofImage.name}</p>
                  </div>
                  <p className="text-xs text-orange-500">Tap to retake</p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 hover:border-orange-300 rounded-xl p-6 text-center transition">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <p className="text-sm text-gray-500">Tap to take photo</p>
                <p className="text-xs text-gray-400 mt-0.5">Required to complete delivery</p>
              </div>
            )}
          </label>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3 pb-4">
        {canAccept && (
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-2xl transition"
          >
            {isLoading ? 'Accepting...' : 'Accept Order'}
          </button>
        )}

        {isOwnOrder && next && (
          <button
            onClick={handleUpdateStatus}
            disabled={isLoading}
            className={`w-full py-3.5 ${next.color} disabled:opacity-60 text-white font-semibold rounded-2xl transition`}
          >
            {isLoading ? 'Updating...' : next.label}
          </button>
        )}

        {order.status === 'delivered' && order.proof_of_delivery_url && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-green-700">✓ Delivery Completed</p>
            <p className="text-xs text-green-500 mt-0.5">{formatRelativeTime(order.delivered_at ?? order.updated_at)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
