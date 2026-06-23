'use client'

import { useState } from 'react'
import { formatCurrency, formatRelativeTime } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import { Pagination } from '@/components/ui/pagination'
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
  is_scheduled: boolean
  users: { full_name: string; email: string } | null
}

interface AdminOrdersTableProps {
  orders: OrderRow[]
}

export function AdminOrdersTable({ orders }: AdminOrdersTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.delivery_address.toLowerCase().includes(search.toLowerCase()) ||
      o.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
    if (statusFilter === 'orphaned') {
      return matchesSearch && o.status === 'pending' && o.payment_status === 'pending' && new Date(o.created_at) < thirtyMinAgo
    }
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const orphanedCount = orders.filter(
    (o) => o.status === 'pending' && o.payment_status === 'pending' && new Date(o.created_at) < thirtyMinAgo
  ).length

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const statuses = ['all', 'pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'orphaned']

  function handleSearch(val: string) { setSearch(val); setPage(1) }
  function handleStatusFilter(val: string) { setStatusFilter(val); setPage(1) }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search orders..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`shrink-0 px-3 py-3 min-h-[44px] rounded-xl text-xs font-medium capitalize transition touch-manipulation flex items-center gap-1.5 ${
                statusFilter === s
                  ? s === 'orphaned' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
              }`}
            >
              {s === 'orphaned' ? 'Orphaned' : s.replace('_', ' ')}
              {s === 'orphaned' && orphanedCount > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 text-xs rounded-full font-bold ${statusFilter === 'orphaned' ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>
                  {orphanedCount}
                </span>
              )}
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
          paginated.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-gray-500">{order.id.slice(0, 8).toUpperCase()}</p>
                    {order.is_scheduled && (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">SCHED</span>
                    )}
                  </div>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No orders found
                  </td>
                </tr>
              )}
              {paginated.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-mono text-gray-500">{order.id.slice(0, 8).toUpperCase()}</p>
                      {order.is_scheduled && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">SCHED</span>
                      )}
                    </div>
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

      <Pagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        noun="orders"
      />
    </div>
  )
}
