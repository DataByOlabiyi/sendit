import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CustomerDashboard } from '@/components/customer/dashboard'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user!.id).single(),
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const activeOrders = orders?.filter(o =>
    ['pending', 'accepted', 'picked_up', 'in_transit'].includes(o.status)
  ) ?? []

  const completedOrders = orders?.filter(o => o.status === 'delivered') ?? []

  return (
    <CustomerDashboard
      profile={profile}
      recentOrders={orders ?? []}
      activeOrders={activeOrders}
      totalDeliveries={completedOrders.length}
    />
  )
}
