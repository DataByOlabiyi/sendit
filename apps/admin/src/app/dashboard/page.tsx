import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalUsers },
    { count: totalRiders },
    { count: totalOrders },
    { count: activeOrders },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'rider'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'picked_up', 'in_transit']),
  ])

  const stats = [
    { label: 'Total Customers', value: totalUsers ?? 0, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Riders', value: totalRiders ?? 0, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Total Orders', value: totalOrders ?? 0, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Active Orders', value: activeOrders ?? 0, color: 'text-orange-500', bg: 'bg-orange-50' },
  ]

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">More analytics coming in Phase 7</h2>
        <p className="text-sm text-gray-500">Revenue charts, retention metrics, conversion rates and more will be added in the admin analytics phase.</p>
      </div>
    </div>
  )
}
