'use client'

import { useState } from 'react'
import { formatCurrency, formatRelativeTime } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import type { OrderStatus } from '@sendit/types'

interface OrderRow {
  id: string
  status: string
  total_fee: number
  payment_status: string
  package_size: string
  pickup_address: string
  delivery_address: string
  created_at: string
  users: { full_name: string; email: string } | null
}

interface AdminOrdersTableProps {
  orders: OrderRow[]
}

export function AdminOrdersTable({ orders }: AdminOrdersTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.delivery_address.toLowerCase().includes(search.toLowerCase()) ||
      o.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statuses = ['all', 'pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled']

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          style={{ fontSize: '16px' }}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium capitalize transition touch-manipulation ${
                statusFilter === s
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">No orders found</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-mono text-gray-500">{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{order.users?.full_name ?? '—'}</p>
                </div>
                <StatusBadge status={order.status as OrderStatus} />
              </div>
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  <p className="text-xs text-gray-500 truncate">{order.pickup_address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-900 shrink-0" />
                  <p className="text-xs text-gray-700 truncate">{order.delivery_address}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_fee)}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs capitalize ${order.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {order.payment_status}
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(order.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Order</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Route</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="text-xs font-mono text-gray-500">{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{order.package_size.replace('_', ' ')}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{order.users?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{order.users?.email}</p>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-xs text-gray-500 truncate">{order.pickup_address}</p>
                    <p className="text-xs font-medium text-gray-900 truncate mt-0.5">{order.delivery_address}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_fee)}</p>
                    <p className={`text-xs mt-0.5 capitalize ${order.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {order.payment_status}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.status as OrderStatus} />
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {formatRelativeTime(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
