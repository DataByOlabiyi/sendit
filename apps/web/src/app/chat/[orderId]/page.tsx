import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ChatPage } from '@/components/chat/chat-page'

export const metadata: Metadata = { title: 'Chat' }

export default async function ChatRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch order with customer info and rider's user info
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      rider_id,
      delivery_address,
      status,
      customer:users!orders_customer_id_fkey(full_name),
      rider:riders!orders_rider_id_fkey(user_id, users!riders_user_id_fkey(full_name))
    `)
    .eq('id', orderId)
    .single()

  if (!order) notFound()

  const isCustomer = order.customer_id === user.id
  const riderUserId = (order.rider as { user_id: string } | null)?.user_id
  const isRider = !!riderUserId && riderUserId === user.id

  if (!isCustomer && !isRider) notFound()

  // Rider must be assigned before chat is possible
  if (!riderUserId) redirect(`/orders/${orderId}`)

  const receiverId = isCustomer ? riderUserId : order.customer_id
  const receiverName = isCustomer
    ? ((order.rider as { users: { full_name: string } } | null)?.users?.full_name ?? 'Rider')
    : ((order.customer as { full_name: string } | null)?.full_name ?? 'Customer')

  return (
    <ChatPage
      orderId={orderId}
      currentUserId={user.id}
      receiverId={receiverId}
      receiverName={receiverName}
      orderAddress={order.delivery_address}
    />
  )
}
