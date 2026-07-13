import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime, formatCurrency } from '@sendit/utils'

export const metadata: Metadata = { title: 'Ops Center' }

export const revalidate = 60

export default async function OpsCenterPage() {
  const supabase = await createClient()

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const ago15min = new Date(now.getTime() - 15 * 60 * 1000)
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const ago1h = new Date(now.getTime() - 60 * 60 * 1000)

  const [
    { data: stuckOrders },
    { count: ordersToday },
    { count: deliveredToday },
    { count: onlineRiders },
    { count: openDisputes },
    { count: openTickets },
    { count: paymentFailures1h },
    { count: pendingKyc },
    { count: pendingRiders },
    { data: recentRefunds },
    { data: assignedToday },
    { data: topStuckOrders },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, reference, pickup_address, delivery_address, created_at, total_fee')
      .eq('status', 'pending')
      .is('rider_id', null)
      .lt('created_at', ago15min.toISOString())
      .order('created_at', { ascending: true })
      .limit(50),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('delivered_at', todayStart.toISOString()),
    supabase
      .from('riders')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true)
      .eq('status', 'approved'),
    supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'under_review']),
    supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', ago1h.toISOString()),
    supabase
      .from('riders')
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', 'submitted'),
    supabase
      .from('riders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('payments')
      .select('id, order_id, amount, created_at, orders!inner(reference, pickup_address, delivery_address)')
      .eq('status', 'refunded')
      .gte('updated_at', ago24h.toISOString())
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('orders')
      .select('id, assigned_at')
      .not('assigned_at', 'is', null)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('id, reference, pickup_address, delivery_address, created_at, total_fee, users!customer_id(full_name, email)')
      .eq('status', 'pending')
      .is('rider_id', null)
      .lt('created_at', ago15min.toISOString())
      .order('created_at', { ascending: true })
      .limit(10),
  ])

  const stuckCount = stuckOrders?.length ?? 0
  const totalToday = ordersToday ?? 0
  const dispatchRate = totalToday > 0
    ? Math.round(((assignedToday?.length ?? 0) / totalToday) * 100)
    : 0

  const alerts: { level: 'critical' | 'warning'; message: string; href?: string }[] = []
  if (stuckCount > 0) alerts.push({ level: 'critical', message: `${stuckCount} order${stuckCount > 1 ? 's' : ''} stuck in dispatch for 15+ minutes`, href: '#stuck-dispatch-queue' })
  if ((onlineRiders ?? 0) === 0) alerts.push({ level: 'critical', message: 'No riders currently online — deliveries cannot be assigned' })
  if ((paymentFailures1h ?? 0) >= 5) alerts.push({ level: 'critical', message: `${paymentFailures1h} payment failures in the last hour`, href: '/dashboard/payments' })
  if ((openDisputes ?? 0) > 10) alerts.push({ level: 'warning', message: `${openDisputes} open disputes need attention`, href: '/dashboard/disputes' })
  if ((pendingKyc ?? 0) > 0) alerts.push({ level: 'warning', message: `${pendingKyc} KYC submission${(pendingKyc ?? 0) > 1 ? 's' : ''} awaiting review`, href: '/dashboard/kyc' })
  if ((pendingRiders ?? 0) > 0) alerts.push({ level: 'warning', message: `${pendingRiders} rider application${(pendingRiders ?? 0) > 1 ? 's' : ''} awaiting approval`, href: '/dashboard/riders' })

  const metrics = [
    { label: 'Orders Today', value: totalToday.toLocaleString(), sub: `${deliveredToday ?? 0} delivered`, color: 'text-gray-900' },
    { label: 'Dispatch Rate', value: `${dispatchRate}%`, sub: 'of today\'s orders assigned', color: dispatchRate < 80 ? 'text-red-600' : 'text-green-600' },
    { label: 'Online Riders', value: (onlineRiders ?? 0).toLocaleString(), sub: 'available now', color: (onlineRiders ?? 0) === 0 ? 'text-red-600' : 'text-green-600' },
    { label: 'Open Disputes', value: (openDisputes ?? 0).toLocaleString(), sub: 'need resolution', color: (openDisputes ?? 0) > 5 ? 'text-red-600' : 'text-gray-900' },
    { label: 'Support Tickets', value: (openTickets ?? 0).toLocaleString(), sub: 'open / in progress', color: (openTickets ?? 0) > 20 ? 'text-red-600' : 'text-gray-900' },
    { label: 'Payment Failures', value: (paymentFailures1h ?? 0).toLocaleString(), sub: 'last hour', color: (paymentFailures1h ?? 0) >= 5 ? 'text-red-600' : 'text-gray-900' },
  ]

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operations Center</h1>
        <p className="text-sm text-gray-500 mt-1">Live platform health — refreshes every 60 seconds</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, i) => {
            const classes = `flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
              alert.level === 'critical'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            } ${alert.href ? (alert.level === 'critical' ? 'hover:bg-red-100' : 'hover:bg-yellow-100') : ''}`
            const content = (
              <>
                <span className="mt-0.5">{alert.level === 'critical' ? '🔴' : '🟡'}</span>
                {alert.message}
              </>
            )
            return alert.href ? (
              <Link key={i} href={alert.href} className={classes}>{content}</Link>
            ) : (
              <div key={i} className={classes}>{content}</div>
            )
          })}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-green-50 border border-green-200 text-green-700 mb-6">
          <span>🟢</span>
          All systems operating normally
        </div>
      )}

      {/* Live Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{m.label}</p>
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stuck Dispatch Queue */}
        <div id="stuck-dispatch-queue" className="bg-white rounded-2xl border border-gray-100 p-5 scroll-mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Stuck Dispatch Queue</h2>
            {stuckCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {stuckCount} stuck
              </span>
            )}
          </div>
          {(topStuckOrders?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No stuck orders — dispatch is healthy</p>
          ) : (
            <div className="space-y-3">
              {topStuckOrders?.map((order) => {
                const customer = order.users as unknown as { full_name: string; email: string } | null
                return (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition rounded-lg -mx-2 px-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.reference}</p>
                      <p className="text-xs text-gray-500 truncate">{order.pickup_address}</p>
                      {customer && <p className="text-xs text-gray-400 truncate">{customer.full_name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-red-600">{formatRelativeTime(order.created_at)}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(order.total_fee)}</p>
                    </div>
                  </Link>
                )
              })}
              {stuckCount > 10 && (
                <p className="text-xs text-gray-400 pt-1">+{stuckCount - 10} more stuck orders</p>
              )}
            </div>
          )}
        </div>

        {/* Recent Refunds */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Refunds — Last 24h</h2>
          {(recentRefunds?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No refunds in the last 24 hours</p>
          ) : (
            <div className="space-y-3">
              {recentRefunds?.map((refund) => {
                const order = refund.orders as unknown as { reference: string; pickup_address: string; delivery_address: string } | null
                return (
                  <Link
                    key={refund.id}
                    href={`/dashboard/orders/${refund.order_id}`}
                    className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition rounded-lg -mx-2 px-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{order?.reference ?? '—'}</p>
                      <p className="text-xs text-gray-500 truncate">{order?.pickup_address}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-red-600">−{formatCurrency(refund.amount)}</p>
                      <p className="text-xs text-gray-400">{formatRelativeTime(refund.created_at)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pending Admin Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'KYC Reviews', count: pendingKyc ?? 0, href: '/dashboard/kyc', color: 'bg-blue-50 text-blue-700' },
              { label: 'Rider Approvals', count: pendingRiders ?? 0, href: '/dashboard/riders', color: 'bg-purple-50 text-purple-700' },
              { label: 'Open Disputes', count: openDisputes ?? 0, href: '/dashboard/disputes', color: 'bg-orange-50 text-orange-700' },
              { label: 'Support Tickets', count: openTickets ?? 0, href: '/dashboard/support', color: 'bg-yellow-50 text-yellow-700' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition">
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.count > 0 ? item.color : 'bg-gray-100 text-gray-400'}`}>
                  {item.count}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Rider Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Rider Fleet Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Online & Available', value: onlineRiders ?? 0, color: 'bg-green-100 text-green-700' },
              { label: 'Pending Approval', value: pendingRiders ?? 0, color: 'bg-yellow-100 text-yellow-700' },
              { label: 'KYC Under Review', value: pendingKyc ?? 0, color: 'bg-blue-100 text-blue-700' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
