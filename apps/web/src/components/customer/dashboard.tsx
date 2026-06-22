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
  walletBalance?: number
}

export function CustomerDashboard({
  profile,
  recentOrders,
  activeOrders,
  totalDeliveries,
  walletBalance = 0,
}: CustomerDashboardProps) {
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] lg:gap-8 lg:items-start">

          {/* ── Left column ── */}
          <div>
            {/* Greeting */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Good {getGreeting()}, {firstName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeOrders.length > 0
                  ? `You have ${activeOrders.length} active ${activeOrders.length === 1 ? 'delivery' : 'deliveries'}`
                  : 'Ready to send something?'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalDeliveries}</p>
                  <p className="text-xs text-gray-500">Total deliveries</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
                  <p className="text-xs text-gray-500">Active now</p>
                </div>
              </div>
            </div>

            {/* Wallet balance banner */}
            {walletBalance > 0 && (
              <Link
                href="/profile"
                className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 hover:border-orange-200 transition mb-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wallet Balance</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(walletBalance)}</p>
                  </div>
                </div>
                <span className="text-xs text-orange-500 font-medium">Top up</span>
              </Link>
            )}

            {/* Book CTA */}
            <Link
              href="/book"
              className="flex items-center justify-between bg-orange-500 hover:bg-orange-600 transition rounded-2xl p-5 mb-6 group"
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

            {/* Active orders */}
            {activeOrders.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Active Deliveries</h2>
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between bg-white rounded-2xl p-4 border border-orange-200 bg-orange-50/30 hover:border-orange-300 transition"
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

            {/* Recent orders — mobile only (shows below CTA) */}
            <section className="lg:hidden">
              <RecentOrders recentOrders={recentOrders} />
            </section>
          </div>

          {/* ── Right column — desktop only ── */}
          <div className="hidden lg:block">
            <RecentOrders recentOrders={recentOrders} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentOrders({ recentOrders }: { recentOrders: Order[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
        <Link href="/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
          View all
        </Link>
      </div>

      {recentOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900">No deliveries yet</p>
          <p className="text-xs text-gray-500 mt-1">Your order history will appear here</p>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            Book your first delivery
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {recentOrders.slice(0, 6).map((order) => (
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
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_fee)}</p>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
