'use client'

import { formatCurrency } from '@sendit/utils'
import { PRICING } from '@sendit/constants'

interface AnalyticsStats {
  totalCustomers: number
  totalRiders: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  completionRate: number
}

interface RecentOrder {
  created_at: string
  status: string
  total_fee: number
}

interface RecentPayment {
  amount: number
  paid_at: string | null
}

interface AnalyticsDashboardProps {
  stats: AnalyticsStats
  recentOrders: RecentOrder[]
  recentPayments: RecentPayment[]
}

export function AnalyticsDashboard({ stats, recentOrders, recentPayments }: AnalyticsDashboardProps) {
  const statCards = [
    { label: 'Total Customers', value: stats.totalCustomers.toLocaleString(), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Riders', value: stats.totalRiders.toLocaleString(), color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), color: 'text-gray-900', bg: 'bg-gray-50' },
    { label: 'Completed', value: stats.completedOrders.toLocaleString(), color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Cancelled', value: stats.cancelledOrders.toLocaleString(), color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const ordersByDay = recentOrders.reduce<Record<string, number>>((acc, order) => {
    const day = new Date(order.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
    acc[day] = (acc[day] ?? 0) + 1
    return acc
  }, {})

  const revenueByDay = recentPayments.reduce<Record<string, number>>((acc, payment) => {
    if (!payment.paid_at) return acc
    const day = new Date(payment.paid_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
    acc[day] = (acc[day] ?? 0) + payment.amount * PRICING.PLATFORM_COMMISSION
    return acc
  }, {})

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
  })

  const maxOrders = Math.max(...last7Days.map((d) => ordersByDay[d] ?? 0), 1)
  const maxRevenue = Math.max(...last7Days.map((d) => revenueByDay[d] ?? 0), 1)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${card.bg} mb-3`}>
              <div className={`w-2.5 h-2.5 rounded-full ${card.color.replace('text-', 'bg-')}`} />
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Platform Revenue (Last 30 Days)</h2>
        <p className="text-3xl font-bold text-orange-500">{formatCurrency(stats.totalRevenue)}</p>
        <p className="text-xs text-gray-400 mt-1">{PRICING.PLATFORM_COMMISSION * 100}% commission on {recentPayments.length} transactions</p>
      </div>

      {/* Orders chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Orders — Last 7 Days</h2>
        <div className="flex items-end gap-2 h-32">
          {last7Days.map((day) => {
            const count = ordersByDay[day] ?? 0
            const height = maxOrders > 0 ? Math.max((count / maxOrders) * 100, 4) : 4
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600">{count || ''}</span>
                <div
                  className="w-full bg-orange-500 rounded-t-lg transition-all"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400 truncate w-full text-center">{day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue — Last 7 Days</h2>
        <div className="flex items-end gap-2 h-32">
          {last7Days.map((day) => {
            const revenue = revenueByDay[day] ?? 0
            const height = maxRevenue > 0 ? Math.max((revenue / maxRevenue) * 100, 4) : 4
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600">
                  {revenue > 0 ? `₦${Math.round(revenue / 1000)}k` : ''}
                </span>
                <div
                  className="w-full bg-green-500 rounded-t-lg transition-all"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400 truncate w-full text-center">{day}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
