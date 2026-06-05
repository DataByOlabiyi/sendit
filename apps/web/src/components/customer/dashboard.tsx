'use client'

import Link from 'next/link'
import { formatCurrency, formatRelativeTime } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import type { User, Order } from '@sendit/types'

interface CustomerDashboardProps {
  profile: User
  recentOrders: Order[]
  activeOrders: Order[]
  totalDeliveries: number
}

export function CustomerDashboard({
  profile,
  recentOrders,
  activeOrders,
  totalDeliveries,
}: CustomerDashboardProps) {
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeOrders.length > 0
            ? `You have ${activeOrders.length} active ${activeOrders.length === 1 ? 'delivery' : 'deliveries'}`
            : 'Ready to send something?'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Deliveries</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalDeliveries}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Now</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{activeOrders.length}</p>
        </div>
      </div>

      {/* Book CTA */}
      <Link
        href="/book"
        className="flex items-center justify-between bg-orange-500 hover:bg-orange-600 transition rounded-2xl p-5 mb-8 group"
      >
        <div>
          <p className="text-white font-semibold text-lg">Book a delivery</p>
          <p className="text-orange-100 text-sm mt-0.5">Fast, reliable, tracked</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Active Deliveries</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 hover:border-orange-200 transition"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatRelativeTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
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

      {/* Recent Orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No deliveries yet</p>
            <p className="text-xs text-gray-500 mt-1">Your order history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 hover:border-orange-200 transition"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatRelativeTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_fee)}</p>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
