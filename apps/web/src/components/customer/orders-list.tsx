'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatRelativeTime } from '@sendit/utils'
import { StatusBadge, EmptyState } from '@sendit/ui'
import { Package } from 'lucide-react'
import type { Order, OrderStatus } from '@sendit/types'

const ACTIVE_STATUSES = ['accepted', 'picked_up', 'in_transit']

const filters: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'in_transit' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

interface OrdersListProps {
  orders: Order[]
}

export function OrdersList({ orders }: OrdersListProps) {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = orders
    .filter((o) => {
      if (filter === 'all') return true
      if (filter === 'in_transit') return ACTIVE_STATUSES.includes(o.status)
      return o.status === filter
    })
    .filter((o) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        o.pickup_address?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q) ||
        o.reference?.toLowerCase().includes(q)
      )
    })

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address or reference…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400 bg-white"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === f.value
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders found"
          description={search ? 'Try a different search term' : 'Try a different filter or book your first delivery'}
          action={!search ? (
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition"
            >
              Book a delivery
            </Link>
          ) : undefined}
          className="min-h-[50vh]"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isActive = ACTIVE_STATUSES.includes(order.status)
            const needsPayment = order.status === 'pending' && order.payment_status === 'pending' && order.payment_method === 'paystack'
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={`block bg-white rounded-2xl border p-4 hover:border-orange-200 transition ${
                  needsPayment ? 'border-yellow-300 bg-yellow-50/30' : isActive ? 'border-orange-200 bg-orange-50/20' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <StatusBadge status={order.status} />
                      {needsPayment && (
                        <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Payment required</span>
                      )}
                      {order.reference && (
                        <span className="text-xs text-gray-400 font-mono">{order.reference}</span>
                      )}
                      <span className="text-xs text-gray-400">{formatRelativeTime(order.created_at)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <p className="text-sm text-gray-600 truncate">{order.pickup_address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-900 shrink-0" />
                        <p className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-gray-900">{formatCurrency(order.total_fee)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{order.package_size}</p>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-orange-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Track
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
