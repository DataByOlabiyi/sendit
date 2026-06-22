'use client'

import { useState, useEffect } from 'react'
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

interface UnitEconomics {
  avgOrderValue: number
  avgPlatformFee: number
  estMaps: number
  estSms: number
  estPaystack: number
  estInfra: number
  totalEstCost: number
  estimatedMargin: number
  marginPct: number
  paidOrderCount: number
}

interface AnalyticsDashboardProps {
  stats: AnalyticsStats
  recentOrders: RecentOrder[]
  recentPayments: RecentPayment[]
  unitEconomics: UnitEconomics
}

type Range = 7 | 30 | 90

function buildDays(range: Range): string[] {
  return Array.from({ length: range }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (range - 1 - i))
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
  })
}

function bucketByDay(items: { date: string; value: number }[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, { date, value }) => {
    acc[date] = (acc[date] ?? 0) + value
    return acc
  }, {})
}

function BarChart({ days, data, color, formatVal }: {
  days: string[]
  data: Record<string, number>
  color: string
  formatVal: (v: number) => string
}) {
  const values = days.map((d) => data[d] ?? 0)
  const max = Math.max(...values, 1)
  // Show every Nth label to avoid crowding
  const labelEvery = days.length > 30 ? 7 : days.length > 14 ? 4 : 1

  return (
    <div className="flex items-end gap-0.5 h-32">
      {days.map((day, i) => {
        const count = values[i]
        const height = Math.max((count / max) * 100, 2)
        const showLabel = i % labelEvery === 0 || i === days.length - 1
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            {count > 0 && (
              <span className="text-xs font-medium text-gray-600 truncate w-full text-center leading-none">
                {formatVal(count)}
              </span>
            )}
            <div className={`w-full ${color} rounded-t transition-all`} style={{ height: `${height}%` }} />
            {showLabel && (
              <span className="text-xs text-gray-400 truncate w-full text-center leading-none">{day}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsDashboard({ stats, recentOrders, recentPayments, unitEconomics }: AnalyticsDashboardProps) {
  const [range, setRange] = useState<Range>(7)

  const statCards = [
    { label: 'Total Customers', value: stats.totalCustomers.toLocaleString(), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Riders', value: stats.totalRiders.toLocaleString(), color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), color: 'text-gray-900', bg: 'bg-gray-50' },
    { label: 'Completed', value: stats.completedOrders.toLocaleString(), color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Cancelled', value: stats.cancelledOrders.toLocaleString(), color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const orderItems = recentOrders.map((o) => ({
    date: new Date(o.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
    value: 1,
  }))

  const revenueItems = recentPayments
    .filter((p) => p.paid_at)
    .map((p) => ({
      date: new Date(p.paid_at!).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      value: p.amount * PRICING.PLATFORM_COMMISSION,
    }))

  const days = buildDays(range)
  const ordersByDay = bucketByDay(orderItems)
  const revenueByDay = bucketByDay(revenueItems)

  const windowRevenue = days.reduce((sum, d) => sum + (revenueByDay[d] ?? 0), 0)
  const windowOrders = days.reduce((sum, d) => sum + (ordersByDay[d] ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

      {/* Date range selector */}
      <div className="flex gap-2">
        {([7, 30, 90] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              range === r ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
            }`}
          >
            {r} days
          </button>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Platform Revenue — Last {range} Days
        </h2>
        <p className="text-3xl font-bold text-orange-500">{formatCurrency(windowRevenue)}</p>
        <p className="text-xs text-gray-400 mt-1">
          {PRICING.PLATFORM_COMMISSION * 100}% commission on {windowOrders} orders
        </p>
      </div>

      {/* Orders chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Orders — Last {range} Days</h2>
        <BarChart
          days={days}
          data={ordersByDay}
          color="bg-orange-500"
          formatVal={(v) => String(v)}
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue — Last {range} Days</h2>
        <BarChart
          days={days}
          data={revenueByDay}
          color="bg-green-500"
          formatVal={(v) => v > 1000 ? `₦${Math.round(v / 1000)}k` : `₦${Math.round(v)}`}
        />
      </div>

      {/* Unit Economics */}
      {unitEconomics.paidOrderCount > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Unit Economics — Per Order</h2>
          <p className="text-xs text-gray-400 mb-4">
            Based on {unitEconomics.paidOrderCount} paid orders in the last 30 days.
            Infrastructure costs are estimates — update as actuals become available.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700">Avg. order value</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(unitEconomics.avgOrderValue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700">Platform commission ({PRICING.PLATFORM_COMMISSION * 100}%)</span>
              <span className="text-sm font-semibold text-green-600">+{formatCurrency(unitEconomics.avgPlatformFee)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-gray-500">Maps API (est.)</span>
              <span className="text-xs text-red-500">−{formatCurrency(unitEconomics.estMaps)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-gray-500">SMS notifications (est.)</span>
              <span className="text-xs text-red-500">−{formatCurrency(unitEconomics.estSms)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-gray-500">Paystack processing (est.)</span>
              <span className="text-xs text-red-500">−{formatCurrency(unitEconomics.estPaystack)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Infrastructure (est.)</span>
              <span className="text-xs text-red-500">−{formatCurrency(unitEconomics.estInfra)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-semibold text-gray-900">Est. margin per order</span>
              <div className="text-right">
                <span className={`text-sm font-bold ${unitEconomics.estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {unitEconomics.estimatedMargin >= 0 ? '+' : ''}{formatCurrency(unitEconomics.estimatedMargin)}
                </span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  unitEconomics.marginPct >= 50 ? 'bg-green-100 text-green-700' :
                  unitEconomics.marginPct >= 20 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {unitEconomics.marginPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
