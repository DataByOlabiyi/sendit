'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }
    const current = Notification.permission as PushPermission
    setPermission(current)

    // A previous session may have already subscribed — reflect that instead
    // of defaulting to "not subscribed" until the user clicks the button again.
    if (current === 'granted') {
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {})
    }
  }, [])

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return

    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const sub = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      })

      const { keys } = sub.toJSON() as { keys?: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys,
          userAgent: navigator.userAgent,
        }),
      })

      setPermission('granted')
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
    }
  }

  async function unsubscribe() {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    }
  }

  async function requestAndSubscribe() {
    const result = await Notification.requestPermission()
    setPermission(result as PushPermission)
    if (result === 'granted') await subscribe()
  }

  return { permission, subscribed, requestAndSubscribe, unsubscribe }
}
