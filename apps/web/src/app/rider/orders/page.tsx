import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderOrdersList } from '@/components/rider/orders-list'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'My Deliveries' }

export default async function RiderOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!rider) redirect('/rider/onboarding')

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('rider_id', rider.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-sm text-gray-500 mt-1">Your delivery history</p>
      </div>
      <RiderOrdersList orders={orders ?? []} />
    </div>
  )
}
