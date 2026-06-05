import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotificationsList } from '@/components/customer/notifications-list'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Stay up to date with your deliveries</p>
      </div>
      <NotificationsList notifications={notifications ?? []} />
    </div>
  )
}
