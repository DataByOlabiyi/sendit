import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationsList } from '@/components/customer/notifications-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Notifications' }

export default async function RiderNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Fetch and mark-as-read in parallel — mark-as-read is fire-and-forget
  const [{ data: notifications }] = await Promise.all([
    admin
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false),
  ])

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Updates on your application and deliveries</p>
      </div>
      <NotificationsList notifications={notifications ?? []} userRole="rider" />
    </div>
  )
}
