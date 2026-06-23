import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PayoutsTable } from '@/components/payouts/payouts-table'

export const metadata: Metadata = { title: 'Rider Payouts' }

export default async function PayoutsPage() {
  const supabase = await createClient()

  const { data: payouts } = await supabase
    .from('rider_payouts')
    .select(`
      id, amount, status, initiated_at, completed_at, failure_reason,
      riders!inner(
        id, bank_account_number, bank_name, bank_account_name, paystack_recipient_code,
        users!inner(full_name, email)
      )
    `)
    .order('initiated_at', { ascending: false })
    .limit(100)

  const { data: stats } = await supabase
    .from('rider_payouts')
    .select('status, amount')

  const totalPending = (stats ?? [])
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + (s.amount ?? 0), 0)

  const totalPaid = (stats ?? [])
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + (s.amount ?? 0), 0)

  const pendingCount = (stats ?? []).filter((s) => s.status === 'pending').length

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rider Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">Review and disburse pending payout requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Requests</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ₦{(totalPending / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Disbursed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            ₦{(totalPaid / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PayoutsTable payouts={(payouts ?? []) as any[]} />
    </div>
  )
}
