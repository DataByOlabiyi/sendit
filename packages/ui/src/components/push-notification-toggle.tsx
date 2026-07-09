'use client'

import { usePushNotifications } from '@sendit/notifications/client'

export function PushNotificationToggle() {
  const { permission, subscribed, requestAndSubscribe, unsubscribe } = usePushNotifications()

  if (permission === 'unsupported') {
    return <p className="text-xs text-gray-400">Push notifications aren&apos;t supported on this device or browser.</p>
  }

  if (permission === 'denied') {
    return <p className="text-xs text-gray-400">Notifications are blocked for this site. Enable them in your browser settings to receive alerts.</p>
  }

  return (
    <button
      type="button"
      onClick={() => (subscribed ? unsubscribe() : requestAndSubscribe())}
      className="w-full py-3 border border-gray-200 hover:border-gray-300 active:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
    >
      {subscribed ? 'Disable Push Notifications' : 'Enable Push Notifications'}
    </button>
  )
}
