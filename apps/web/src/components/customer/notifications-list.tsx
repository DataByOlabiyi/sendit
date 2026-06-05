'use client'

import { formatRelativeTime } from '@sendit/utils'
import type { Notification } from '@sendit/types'

interface NotificationsListProps {
  notifications: Notification[]
}

const typeIcons: Record<string, string> = {
  order_update: '📦',
  chat_message: '💬',
  payment: '💳',
  promotion: '🎁',
  system: '⚙️',
}

export function NotificationsList({ notifications }: NotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">No notifications yet</p>
        <p className="text-xs text-gray-500 mt-1">You&apos;ll see order updates and alerts here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`bg-white rounded-2xl border p-4 ${
            !notification.is_read ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{typeIcons[notification.type] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </p>
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{notification.body}</p>
              <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.created_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
