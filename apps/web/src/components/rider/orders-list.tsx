'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatRelativeTime } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import type { Order, OrderStatus } from '@sendit/types'

const filters: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

interface RiderOrdersListProps {
  orders: Order[]
}

export function RiderOrdersList({ orders }: RiderOrdersListProps) {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const filtered = filter === 'all'
    ? orders
    : filter === 'in_transit'
    ? orders.filter(o => ['accepted', 'picked_up', 'in_transit'].includes(o.status))
    : orders.filter(o => o.status === filter)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No deliveries found</p>
          <p className="text-xs text-gray-500 mt-1">Complete deliveries will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/rider/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={order.status} />
                    <span className="text-xs text-gray-400">{formatRelativeTime(order.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{order.pickup_address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-orange-500">{formatCurrency(order.total_fee * 0.85)}</p>
                  <p className="text-xs text-gray-400">earnings</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
