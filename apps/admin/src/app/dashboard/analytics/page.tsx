import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { count: totalCustomers },
    { count: totalRiders },
    { count: totalOrders },
    { count: completedOrders },
    { count: cancelledOrders },
    { data: recentOrders },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'rider'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('created_at, status, total_fee')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('payments')
      .select('amount, paid_at, status')
      .eq('status', 'paid')
      .gte('paid_at', thirtyDaysAgo.toISOString())
      .order('paid_at', { ascending: true }),
  ])

  const totalRevenue = recentPayments?.reduce((sum, p) => sum + p.amount * 0.15, 0) ?? 0
  const completionRate = totalOrders ? Math.round(((completedOrders ?? 0) / totalOrders) * 100) : 0

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Platform performance overview</p>
      </div>
      <AnalyticsDashboard
        stats={{
          totalCustomers: totalCustomers ?? 0,
          totalRiders: totalRiders ?? 0,
          totalOrders: totalOrders ?? 0,
          completedOrders: completedOrders ?? 0,
          cancelledOrders: cancelledOrders ?? 0,
          totalRevenue,
          completionRate,
        }}
        recentOrders={recentOrders ?? []}
        recentPayments={recentPayments ?? []}
      />
    </div>
  )
}
