import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.05,
  // No session replay — not needed for what this is here to catch
  // (broken uploads, failed emails, payment errors), and it eats free-tier
  // quota fast.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
