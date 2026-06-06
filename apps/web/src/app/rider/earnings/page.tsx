import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderEarnings } from '@/components/rider/earnings'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'My Earnings' }

export default async function RiderEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = await supabase
    .from('riders')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  if (!rider) redirect('/rider/onboarding')

  const { data: rawPayments } = await supabase
    .from('payments')
    .select('id, amount, rider_payout, paid_at, created_at, orders!inner(rider_id, reference)')
    .eq('orders.rider_id', rider.id)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })

  // Normalize the nested orders field — Supabase returns it as an array from the join
  const payments = (rawPayments ?? []).map((p) => {
    const orderData = Array.isArray(p.orders) ? p.orders[0] : p.orders
    return {
      id: p.id as string,
      amount: p.amount as number,
      rider_payout: p.rider_payout as number | null,
      paid_at: p.paid_at as string | null,
      created_at: p.created_at as string,
      orders: orderData ? { reference: (orderData as { reference: string | null }).reference } : null,
    }
  })

  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Track your income</p>
      </div>
      <RiderEarnings payments={payments ?? []} rider={rider} />
    </div>
  )
}
