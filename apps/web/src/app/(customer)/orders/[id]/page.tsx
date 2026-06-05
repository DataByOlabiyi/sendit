import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrderDetail } from '@/components/customer/order-detail'
import { CancelButton } from './cancel-button'

export const metadata: Metadata = { title: 'Order Details' }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user!.id)
    .single()

  if (!order) notFound()

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <OrderDetail order={order} />
      {order.status === 'pending' && (
        <div className="mt-4">
          <CancelButton orderId={order.id} />
        </div>
      )}
    </div>
  )
}
