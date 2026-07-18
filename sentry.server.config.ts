import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Low sample rate — this is for catching real failures (emails, uploads,
  // payments), not full request tracing. Keeps free-tier quota for what
  // actually matters: exceptions.
  tracesSampleRate: 0.05,
})
