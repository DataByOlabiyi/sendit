import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Payment and OTP paths sampled at 100% in production to ensure full visibility
  tracesSampler: ({ attributes }) => {
    const url = attributes?.['http.url'] ?? attributes?.['url.path'] ?? ''
    if (typeof url === 'string' && (url.includes('/book') || url.includes('/paystack') || url.includes('/otp'))) {
      return 1.0
    }
    return process.env.NODE_ENV === 'production' ? 0.2 : 1.0
  },
})
