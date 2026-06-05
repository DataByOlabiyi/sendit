'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatCurrency, formatRelativeTime, formatDistance, formatDuration, haversineDistance } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import { toggleOnlineStatusAction } from '@/app/rider/actions'
import type { Rider, Order } from '@sendit/types'

interface RiderDashboardProps {
  rider: Rider
  availableOrders: Order[]
  activeOrders: Order[]
  todayEarnings: number
}

export function RiderDashboard({ rider, availableOrders, activeOrders, todayEarnings }: RiderDashboardProps) {
  const [isOnline, setIsOnline] = useState(rider.is_online)
  const [isToggling, setIsToggling] = useState(false)

  async function handleToggleOnline() {
    setIsToggling(true)
    try {
      const result = await toggleOnlineStatusAction(!isOnline)
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsOnline(!isOnline)
        toast.success(isOnline ? 'You are now offline' : 'You are now online')
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeOrders.length > 0
              ? `${activeOrders.length} active ${activeOrders.length === 1 ? 'delivery' : 'deliveries'}`
              : 'Ready to deliver'}
          </p>
        </div>

        {/* Online Toggle */}
        <button
          onClick={handleToggleOnline}
          disabled={isToggling || rider.status !== 'approved'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${
            isOnline
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          {isToggling ? 'Updating...' : isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Pending Approval Banner */}
      {rider.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-medium text-yellow-800">Account under review</p>
          <p className="text-xs text-yellow-600 mt-0.5">Your rider account is being reviewed. You'll be notified once approved.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Today</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(todayEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Deliveries</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{rider.total_deliveries}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Rating</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">⭐ {rider.rating.toFixed(1)}</p>
        </div>
      </div>

      {/* Active Deliveries */}
      {activeOrders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Active Deliveries</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/rider/orders/${order.id}`}
                className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl p-4 hover:border-orange-300 transition"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatRelativeTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={order.status} />
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Available Orders */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Available Orders
          <span className="ml-2 text-sm font-normal text-gray-400">({availableOrders.length})</span>
        </h2>

        {!isOnline ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm font-medium text-gray-900">You're offline</p>
            <p className="text-xs text-gray-500 mt-1">Go online to see available orders</p>
          </div>
        ) : rider.status !== 'approved' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm font-medium text-gray-900">Account pending approval</p>
            <p className="text-xs text-gray-500 mt-1">You'll be able to accept orders once approved</p>
          </div>
        ) : availableOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm font-medium text-gray-900">No available orders</p>
            <p className="text-xs text-gray-500 mt-1">New orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableOrders.map((order) => {
              const distanceKm = haversineDistance(
                order.pickup_lat, order.pickup_lng,
                order.delivery_lat, order.delivery_lng
              )
              return (
                <Link
                  key={order.id}
                  href={`/rider/orders/${order.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 transition"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{order.pickup_address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-900 shrink-0" />
                        <p className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-orange-500">{formatCurrency(order.total_fee * 0.85)}</p>
                      <p className="text-xs text-gray-400">your cut</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>{formatDistance(distanceKm)}</span>
                    <span>{formatDuration(Math.ceil(distanceKm * 4))}</span>
                    <span className="capitalize">{order.package_size.replace('_', ' ')}</span>
                    {order.is_fragile && <span className="text-orange-500">⚠️ Fragile</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
