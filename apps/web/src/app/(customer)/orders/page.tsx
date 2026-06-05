import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrdersList } from '@/components/customer/orders-list'

export const metadata: Metadata = { title: 'My Orders' }

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your deliveries</p>
      </div>
      <OrdersList orders={orders ?? []} />
    </div>
  )
}
