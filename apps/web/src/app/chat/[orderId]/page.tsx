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

  // Supabase join may return array or object — normalise to single value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riderRaw = order.rider as any
  const riderObj: { user_id: string; users: { full_name: string } | { full_name: string }[] | null } | null =
    Array.isArray(riderRaw) ? (riderRaw[0] ?? null) : riderRaw ?? null

  const riderUserId: string | null = riderObj?.user_id ?? null
  const isRider = !!riderUserId && riderUserId === user.id

  if (!isCustomer && !isRider) notFound()

  // Rider must be assigned before chat is possible
  if (!riderUserId) redirect(`/orders/${orderId}`)

  const receiverId = isCustomer ? riderUserId : order.customer_id
  const riderUsers = riderObj?.users
  const riderName = Array.isArray(riderUsers) ? (riderUsers[0]?.full_name ?? 'Rider') : (riderUsers?.full_name ?? 'Rider')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerName = ((order.customer as any)?.full_name as string | undefined) ?? 'Customer'
  const receiverName = isCustomer ? riderName : customerName

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
