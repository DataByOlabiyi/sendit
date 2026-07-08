import type { Metadata } from 'next'
import { BroadcastForm } from '@/components/notifications/broadcast-form'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Send broadcasts to users and riders</p>
      </div>
      <BroadcastForm />
    </div>
  )
}
