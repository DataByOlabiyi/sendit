import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderDashboard } from '@/components/rider/dashboard'
import { redirect } from 'next/navigation'
import { haversineDistance } from '@sendit/utils'
import { PRICING } from '@sendit/constants'

export const metadata: Metadata = { title: 'Rider Dashboard' }

const PROXIMITY_RADIUS_KM = 15

export default async function RiderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = await supabase
    .from('riders')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!rider || rider.status === 'pending' || rider.status === 'rejected') {
    redirect('/rider/onboarding')
  }

  const [{ data: allPendingOrders }, { data: activeOrders }, { data: todayPayments }] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('orders')
        .select('*')
        .eq('rider_id', rider.id)
        .in('status', ['accepted', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('amount, rider_payout')
        .eq('status', 'paid')
        .gte('paid_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])

  // Filter available orders by rider's current position if known
  let availableOrders = allPendingOrders ?? []
  if (rider.current_lat && rider.current_lng) {
    availableOrders = availableOrders
      .filter((order) => {
        const dist = haversineDistance(
          rider.current_lat!,
          rider.current_lng!,
          order.pickup_lat,
          order.pickup_lng,
        )
        return dist <= PROXIMITY_RADIUS_KM
      })
      .sort((a, b) => {
        const da = haversineDistance(rider.current_lat!, rider.current_lng!, a.pickup_lat, a.pickup_lng)
        const db = haversineDistance(rider.current_lat!, rider.current_lng!, b.pickup_lat, b.pickup_lng)
        return da - db
      })
      .slice(0, 20)
  } else {
    // No GPS fix yet — show up to 20 most recent pending orders
    availableOrders = availableOrders.slice(0, 20)
  }

  // Use stored rider_payout if present (accurate), otherwise fall back to commission constant
  const todayEarnings =
    todayPayments?.reduce((sum, p) => {
      return sum + (p.rider_payout ?? p.amount * (1 - PRICING.PLATFORM_COMMISSION))
    }, 0) ?? 0

  return (
    <RiderDashboard
      rider={rider}
      availableOrders={availableOrders}
      activeOrders={activeOrders ?? []}
      todayEarnings={todayEarnings}
    />
  )
}
