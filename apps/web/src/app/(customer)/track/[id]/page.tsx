import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LiveTrackingMap } from '@/components/customer/live-tracking-map'
import { StatusBadge } from '@sendit/ui'

export const metadata: Metadata = { title: 'Track Delivery' }

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order } = await supabase
    .from('orders')
    .select('*, riders(id, user_id, users(full_name))')
    .eq('id', id)
    .eq('customer_id', user!.id)
    .single()

  if (!order) notFound()

  const rider = order.riders as { id: string; user_id: string; users: { full_name: string } | null } | null
  const riderId = rider?.id ?? null

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to order
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Track Delivery</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {(order.reference as string | null) ?? order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <LiveTrackingMap
        orderId={order.id}
        riderId={riderId}
        pickupLat={order.pickup_lat}
        pickupLng={order.pickup_lng}
        pickupAddress={order.pickup_address}
        deliveryLat={order.delivery_lat}
        deliveryLng={order.delivery_lng}
        deliveryAddress={order.delivery_address}
        orderStatus={order.status}
      />
    </div>
  )
}
