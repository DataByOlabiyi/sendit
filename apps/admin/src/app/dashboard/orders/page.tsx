import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AdminOrdersTable } from '@/components/orders/orders-table'

export const metadata: Metadata = { title: 'Orders' }

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, users!orders_customer_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage all deliveries</p>
      </div>
      <AdminOrdersTable orders={orders ?? []} />
    </div>
  )
}
