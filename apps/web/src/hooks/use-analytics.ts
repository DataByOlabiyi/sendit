'use client'

import { usePostHog } from 'posthog-js/react'

export function useAnalytics() {
  const posthog = usePostHog()

  return {
    track: (event: string, properties?: Record<string, unknown>) => {
      posthog?.capture(event, properties)
    },
    identify: (userId: string, traits?: Record<string, unknown>) => {
      posthog?.identify(userId, traits)
    },
    reset: () => {
      posthog?.reset()
    },
  }
}
