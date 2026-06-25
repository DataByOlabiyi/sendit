import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserActions } from '@/components/users/user-actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Customer Detail' }

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700',
  accepted:   'bg-blue-50 text-blue-700',
  picked_up:  'bg-indigo-50 text-indigo-700',
  in_transit: 'bg-purple-50 text-purple-700',
  delivered:  'bg-green-50 text-green-700',
  cancelled:  'bg-red-50 text-red-700',
}

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: user }, { data: orders }] = await Promise.all([
    supabase.from('users').select('*').eq('id', id).single(),
    supabase
      .from('orders')
      .select('id, status, total_fee, created_at, pickup_address, delivery_address')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!user) notFound()

  const allOrders = orders ?? []
  const totalSpend = allOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_fee ?? 0), 0)

  return (
    <div className="px-6 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Customers
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
          {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Joined {new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${
          user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {user.is_active ? 'Active' : 'Suspended'}
        </span>
      </div>

      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: allOrders.length },
            { label: 'Completed', value: allOrders.filter((o) => o.status === 'delivered').length },
            { label: 'Cancelled', value: allOrders.filter((o) => o.status === 'cancelled').length },
            { label: 'Total Spent', value: formatNaira(totalSpend) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Account</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Phone</p>
              <p className="text-sm font-medium text-gray-900">{user.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <p className={`text-sm font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {user.is_active ? 'Active' : 'Suspended'}
              </p>
            </div>
          </div>
        </div>

        {/* Account actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Actions</h2>
          <UserActions userId={user.id} isActive={user.is_active} />
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Recent Orders ({allOrders.length})
            </h2>
          </div>
          {allOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Route</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3">
                      <p className="text-xs text-gray-700 truncate max-w-[200px]">{order.pickup_address}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">→ {order.delivery_address}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ORDER_STATUS_STYLES[order.status] ?? 'bg-gray-50 text-gray-500'}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {order.total_fee ? formatNaira(order.total_fee) : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
