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

  const { data: payments } = await supabase
    .from('payments')
    .select('*, orders!inner(rider_id)')
    .eq('orders.rider_id', rider.id)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })

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
