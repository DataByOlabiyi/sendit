import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrderDetail } from '@/components/customer/order-detail'
import { CancelOrderButton } from '@/components/customer/CancelOrderButton'

export const metadata: Metadata = { title: 'Order Details' }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order } = await supabase
    .from('orders')
    .select('*, riders(id, user_id, users(full_name))')
    .eq('id', id)
    .eq('customer_id', user!.id)
    .single()

  if (!order) notFound()

  // Check if customer has already reviewed this order
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', id)
    .eq('reviewer_id', user!.id)
    .maybeSingle()

  const riderData = order.riders as { id: string; user_id: string; users: { full_name: string } | null } | null

  const enrichedOrder = {
    ...order,
    rider: riderData?.users ?? null,
    riderId: riderData?.id ?? null,
    hasExistingReview: !!existingReview,
  }

  return (
    <div>
      <OrderDetail order={enrichedOrder} />
      {order.status === 'pending' && (
        <div className="px-4 pb-8 max-w-2xl mx-auto">
          <CancelOrderButton
            orderId={order.id}
            isPaid={order.payment_status === 'paid'}
            totalFee={order.total_fee}
          />
        </div>
      )}
    </div>
  )
}
