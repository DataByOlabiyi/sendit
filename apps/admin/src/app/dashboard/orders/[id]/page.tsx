import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import type { OrderStatus } from '@sendit/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Order Detail' }

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700',
  paid:     'bg-green-50 text-green-700',
  failed:   'bg-red-50 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: order }, { data: payments }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, users!orders_customer_id_fkey(full_name, email, phone), riders(id, users!riders_user_id_fkey(full_name, phone))')
      .eq('id', id)
      .single(),
    supabase
      .from('payments')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!order) notFound()

  const customer = order.users as { full_name: string; email: string; phone: string | null } | null
  const rider = order.riders as { id: string; users: { full_name: string; phone: string | null } | null } | null

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{order.reference ?? order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(order.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={order.status as OrderStatus} />
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PAYMENT_STATUS_STYLES[order.payment_status] ?? 'bg-gray-50 text-gray-500'}`}>
            {order.payment_status} &middot; {order.payment_method}
          </span>
        </div>
      </div>

      <div className="space-y-6">

        {/* Customer & Rider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Customer</h2>
            <p className="text-sm font-medium text-gray-900">{customer?.full_name ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{customer?.email}</p>
            {customer?.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rider</h2>
            {rider?.users ? (
              <>
                <p className="text-sm font-medium text-gray-900">{rider.users.full_name}</p>
                {rider.users.phone && <p className="text-xs text-gray-500 mt-0.5">{rider.users.phone}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-400">Not yet assigned</p>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Route</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Pickup</p>
                <p className="text-sm text-gray-900">{order.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-900 mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Delivery</p>
                <p className="text-sm text-gray-900">{order.delivery_address}</p>
                {order.delivery_contact_name && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.delivery_contact_name}{order.delivery_contact_phone ? ` · ${order.delivery_contact_phone}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Package */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Package</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">Description</p>
              <p className="text-sm font-medium text-gray-900">{order.package_description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Size</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{order.package_size.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Fragile</p>
              <p className="text-sm font-medium text-gray-900">{order.is_fragile ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Insured</p>
              <p className="text-sm font-medium text-gray-900">{order.has_insurance ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Pricing</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Base fee</span>
              <span className="text-gray-900">{formatCurrency(order.base_fee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Distance fee</span>
              <span className="text-gray-900">{formatCurrency(order.distance_fee)}</span>
            </div>
            {order.insurance_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Insurance</span>
                <span className="text-gray-900">{formatCurrency(order.insurance_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatCurrency(order.total_fee)}</span>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Payment Records</h2>
          {!payments?.length ? (
            <p className="text-sm text-gray-400">No payment records yet</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-500 truncate">{payment.paystack_reference ?? payment.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400 capitalize">{payment.method}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                    <span className={`text-xs capitalize px-1.5 py-0.5 rounded-md ${PAYMENT_STATUS_STYLES[payment.status] ?? 'bg-gray-50 text-gray-500'}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancellation info */}
        {order.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Cancellation</h2>
            <p className="text-sm text-red-800">
              Cancelled by {order.cancelled_by ?? 'unknown'}{order.cancelled_reason ? ` — ${order.cancelled_reason}` : ''}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
