import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PRICING } from '@sendit/constants'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { count: totalUsers },
    { count: totalRiders },
    { count: totalOrders },
    { count: activeOrders },
    { count: completedOrders },
    { data: weekPayments },
    { count: pendingPayouts },
    { count: openDisputes },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'rider'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'picked_up', 'in_transit']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
    supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', sevenDaysAgo.toISOString()),
    supabase.from('rider_payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
  ])

  const weekRevenue = (weekPayments ?? []).reduce((sum, p) => sum + p.amount * PRICING.PLATFORM_COMMISSION, 0)
  const completionRate = totalOrders ? Math.round(((completedOrders ?? 0) / totalOrders) * 100) : 0

  const stats = [
    { label: 'Total Customers', value: totalUsers ?? 0, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Riders', value: totalRiders ?? 0, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Total Orders', value: totalOrders ?? 0, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Active Orders', value: activeOrders ?? 0, color: 'text-orange-500', bg: 'bg-orange-50' },
  ]

  const alerts = [
    pendingPayouts && pendingPayouts > 0
      ? { label: `${pendingPayouts} pending payout${pendingPayouts !== 1 ? 's' : ''}`, href: '/dashboard/payouts', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' }
      : null,
    openDisputes && openDisputes > 0
      ? { label: `${openDisputes} open dispute${openDisputes !== 1 ? 's' : ''}`, href: '/dashboard/disputes', color: 'text-red-700 bg-red-50 border-red-200' }
      : null,
  ].filter(Boolean) as { label: string; href: string; color: string }[]

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {alerts.map((alert) => (
            <Link
              key={alert.href}
              href={alert.href}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition hover:opacity-80 ${alert.color}`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-60" />
              {alert.label}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${stat.bg} mb-3`}>
              <div className={`w-3 h-3 rounded-full ${stat.color.replace('text-', 'bg-')}`} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <p className="text-xs text-orange-200 uppercase tracking-wide mb-1">Revenue — 7 days</p>
          <p className="text-2xl font-bold">
            ₦{weekRevenue.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-orange-200 mt-1">{weekPayments?.length ?? 0} paid orders</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{completedOrders?.toLocaleString()} delivered</p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col justify-between hover:border-orange-200 transition group"
        >
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Analytics</p>
            <p className="text-sm font-medium text-gray-900">Charts, trends & unit economics</p>
          </div>
          <p className="text-xs text-orange-500 group-hover:text-orange-600 mt-3 font-medium">View →</p>
        </Link>
      </div>
    </div>
  )
}
