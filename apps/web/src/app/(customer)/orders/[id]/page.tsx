import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrderDetail } from '@/components/customer/order-detail'
import { CancelOrderButton } from '@/components/customer/CancelOrderButton'
import { InsuranceClaimButton } from '@/components/customer/InsuranceClaimButton'
import { ResumePaymentButton } from '@/components/customer/ResumePaymentButton'

export const metadata: Metadata = { title: 'Order Details' }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order } = await supabase
    .from('orders')
    .select('*, riders(id, user_id, rating, users(full_name))')
    .eq('id', id)
    .eq('customer_id', user!.id)
    .single()

  if (!order) notFound()

  const [{ data: existingReview }, { data: existingClaim }] = await Promise.all([
    supabase.from('reviews').select('id').eq('order_id', id).eq('reviewer_id', user!.id).maybeSingle(),
    supabase.from('insurance_claims').select('status').eq('order_id', id).maybeSingle(),
  ])

  const riderData = order.riders as { id: string; user_id: string; rating: number; users: { full_name: string } | null } | null

  const enrichedOrder = {
    ...order,
    rider: riderData?.users ? { ...riderData.users, rating: riderData.rating } : null,
    riderId: riderData?.id ?? null,
    hasExistingReview: !!existingReview,
  }

  const cancellableStatuses = ['pending', 'accepted', 'picked_up', 'in_transit']
  const showCancelArea = cancellableStatuses.includes(order.status)

  const showResumePayment =
    order.status === 'pending' &&
    order.payment_status === 'pending' &&
    order.payment_method === 'paystack'

  return (
    <div>
      <OrderDetail order={enrichedOrder} />
      {showResumePayment && (
        <div className="px-4 pt-2 max-w-2xl mx-auto">
          <ResumePaymentButton
            orderId={order.id}
            totalFee={order.total_fee}
            reference={order.reference ?? null}
          />
        </div>
      )}
      {order.has_insurance && order.status === 'delivered' && (
        <div className="px-4 pb-4 max-w-2xl mx-auto">
          <InsuranceClaimButton
            orderId={order.id}
            totalFee={order.total_fee}
            existingClaim={existingClaim}
          />
        </div>
      )}

      {showCancelArea && (
        <div className="px-4 pb-8 max-w-2xl mx-auto">
          {order.status === 'pending' ? (
            <CancelOrderButton
              orderId={order.id}
              isPaid={order.payment_status === 'paid'}
              totalFee={order.total_fee}
            />
          ) : (
            <div className="w-full py-3 px-4 border border-gray-200 rounded-2xl text-center">
              <p className="text-sm font-medium text-gray-400">Cannot cancel</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {order.status === 'accepted' && 'A rider has already accepted this order.'}
                {order.status === 'picked_up' && 'Your order has been picked up by the rider.'}
                {order.status === 'in_transit' && 'Your order is on its way to you.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
