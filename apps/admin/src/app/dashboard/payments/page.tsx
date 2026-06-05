import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PaymentsTable } from '@/components/payments/payments-table'

export const metadata: Metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('*, users!payments_customer_id_fkey(full_name, email), orders!payments_order_id_fkey(pickup_address, delivery_address)')
    .order('created_at', { ascending: false })
    .limit(100)

  const totalRevenue = payments
    ?.filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount * 0.15, 0) ?? 0

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Track all transactions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Platform Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ₦{totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">15% commission</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Successful</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {payments?.filter((p) => p.status === 'paid').length ?? 0}
          </p>
        </div>
      </div>

      <PaymentsTable payments={payments ?? []} />
    </div>
  )
}
