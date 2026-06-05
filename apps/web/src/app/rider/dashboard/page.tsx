import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderDashboard } from '@/components/rider/dashboard'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Rider Dashboard' }

export default async function RiderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = await supabase
    .from('riders')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  if (!rider) redirect('/rider/onboarding')

  const [{ data: availableOrders }, { data: activeOrders }, { data: todayPayments }] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('orders')
        .select('*')
        .eq('rider_id', rider.id)
        .in('status', ['accepted', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])

  const todayEarnings = todayPayments?.reduce((sum, p) => {
    const commission = p.amount * 0.85
    return sum + commission
  }, 0) ?? 0

  return (
    <RiderDashboard
      rider={rider}
      availableOrders={availableOrders ?? []}
      activeOrders={activeOrders ?? []}
      todayEarnings={todayEarnings}
    />
  )
}
