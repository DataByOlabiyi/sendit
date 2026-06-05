'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@sendit/utils'
import type { Rider } from '@sendit/types'

interface Payment {
  id: string
  amount: number
  paid_at: string | null
  created_at: string
}

interface RiderEarningsProps {
  payments: Payment[]
  rider: Rider
}

type Period = 'today' | 'week' | 'month' | 'all'

export function RiderEarnings({ payments, rider }: RiderEarningsProps) {
  const [period, setPeriod] = useState<Period>('week')

  function filterByPeriod(period: Period): Payment[] {
    const now = new Date()
    return payments.filter((p) => {
      if (!p.paid_at) return false
      const paidAt = new Date(p.paid_at)
      switch (period) {
        case 'today': {
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          return paidAt >= today
        }
        case 'week': {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          return paidAt >= weekAgo
        }
        case 'month': {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return paidAt >= monthAgo
        }
        default:
          return true
      }
    })
  }

  const filtered = filterByPeriod(period)
  const totalEarnings = filtered.reduce((sum, p) => sum + p.amount * 0.85, 0)
  const totalOrders = filtered.length

  const periods: { value: Period; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ]

  return (
    <div>
      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              period === p.value
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Earnings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Deliveries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Deliveries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{rider.total_deliveries}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Rating</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">⭐ {rider.rating.toFixed(1)}</p>
        </div>
      </div>

      {/* Commission note */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6">
        <p className="text-xs text-orange-700">
          <strong>Commission:</strong> You earn 85% of each delivery fee. The remaining 15% is the platform fee.
        </p>
      </div>

      {/* Transaction list */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Transactions</h2>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No transactions yet</p>
          <p className="text-xs text-gray-500 mt-1">Completed deliveries will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Delivery completed</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                </p>
              </div>
              <p className="text-base font-bold text-green-600">+{formatCurrency(payment.amount * 0.85)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
