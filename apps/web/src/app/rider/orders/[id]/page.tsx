import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderOrderDetail } from '@/components/rider/order-detail'

export const metadata: Metadata = { title: 'Delivery Details' }

export default async function RiderOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!rider) notFound()

  const { data: order } = await supabase
    .from('orders')
    .select('*, users!orders_customer_id_fkey(full_name, phone, email)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  // Allow riders to see pending orders or their own orders
  const isOwnOrder = order.rider_id === rider.id
  const isPending = order.status === 'pending'
  if (!isOwnOrder && !isPending) notFound()

  return <RiderOrderDetail order={order} riderId={rider.id} />
}
