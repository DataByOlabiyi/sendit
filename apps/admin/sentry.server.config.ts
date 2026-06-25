import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  // Payment/dispute resolution paths sampled at 100% in production
  tracesSampler: ({ attributes }) => {
    const url = attributes?.['http.url'] ?? attributes?.['url.path'] ?? ''
    if (typeof url === 'string' && (url.includes('/refund') || url.includes('/disputes') || url.includes('/payouts'))) {
      return 1.0
    }
    return process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.2 : 1.0
  },
})
