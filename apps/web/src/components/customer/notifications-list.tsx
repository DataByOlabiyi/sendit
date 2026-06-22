'use client'

import { useRouter } from 'next/navigation'
import { formatRelativeTime } from '@sendit/utils'
import { EmptyState } from '@sendit/ui'
import { Bell } from 'lucide-react'
import type { Notification } from '@sendit/types'

interface NotificationsListProps {
  notifications: Notification[]
  userRole?: 'customer' | 'rider'
}

const typeIcons: Record<string, string> = {
  order_update: '📦',
  chat_message: '💬',
  payment: '💳',
  promotion: '🎁',
  system: '⚙️',
}

function getDeepLink(notification: Notification, userRole: 'customer' | 'rider'): string | null {
  const data = notification.data as Record<string, string> | null
  const orderId = data?.order_id

  if (!orderId) return null

  if (notification.type === 'order_update' || notification.type === 'payment') {
    return userRole === 'rider' ? `/rider/orders/${orderId}` : `/orders/${orderId}`
  }

  if (notification.type === 'chat_message') {
    return `/chat/${orderId}`
  }

  return null
}

export function NotificationsList({ notifications, userRole = 'customer' }: NotificationsListProps) {
  const router = useRouter()

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="You'll see order updates and alerts here. Make sure notifications are enabled in your browser or device settings."
        className="min-h-[50vh]"
      />
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
        const deepLink = getDeepLink(notification, userRole)
        const isClickable = !!deepLink

        const inner = (
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{typeIcons[notification.type] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  )}
                  {isClickable && (
                    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{notification.body}</p>
              <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.created_at)}</p>
            </div>
          </div>
        )

        if (isClickable) {
          return (
            <button
              key={notification.id}
              onClick={() => router.push(deepLink!)}
              className={`w-full text-left bg-white rounded-2xl border p-4 hover:border-orange-200 hover:bg-orange-50/20 transition cursor-pointer ${
                !notification.is_read ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
              }`}
            >
              {inner}
            </button>
          )
        }

        return (
          <div
            key={notification.id}
            className={`bg-white rounded-2xl border p-4 ${
              !notification.is_read ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
            }`}
          >
            {inner}
          </div>
        )
      })}
    </div>
  )
}
