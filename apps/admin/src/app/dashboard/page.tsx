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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 mb-3">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalUsers ?? 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Customers</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 mb-3">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <circle cx="5.5" cy="17.5" r="2.5" />
              <circle cx="18.5" cy="17.5" r="2.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6h2l3 5.5M9 6l1 4h5l1-4M8 10l-2.5 7.5" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalRiders ?? 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Riders</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalOrders ?? 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 mb-3">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(activeOrders ?? 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Active Orders</p>
        </div>
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
