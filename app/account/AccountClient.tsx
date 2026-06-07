'use client'

import GoogleSignInButton from '@/components/GoogleSignInButton'

interface Props {
  reason?: string
  next?: string
}

// Customer-context URLs — when `next` starts with these, hide the provider role options
const CUSTOMER_PATHS = ['/provider/', '/broadcast', '/my-account', '/search', '/dog-', '/grooming', '/vets', '/pet-store', '/dog-training', '/insurance']

export default function AccountClient({ reason, next }: Props) {
  const isProviderFlow = reason === 'provider'

  // If the user came from a customer-facing page, never show provider options
  const isCustomerContext = !isProviderFlow && next != null && CUSTOMER_PATHS.some(p => next.startsWith(p))

  const redirectNext = next ?? (isProviderFlow ? '/pro/dashboard' : '/my-account')

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <div className="text-center mb-8">
        <span className="text-5xl">🐾</span>
        <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-2">
          {isProviderFlow ? 'Provider sign in' : 'Welcome to PawLocal'}
        </h1>
        <p className="text-sm text-slate-500">
          {isProviderFlow
            ? 'Sign in to access your dashboard and manage your listing.'
            : isCustomerContext
              ? 'Quick sign in to continue — free, takes 10 seconds.'
              : 'Sign in to save providers, post requests, and leave reviews.'}
        </p>
      </div>

      {/* Google sign-in */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm mb-4">
        <GoogleSignInButton
          redirectNext={redirectNext}
          label={isProviderFlow ? 'Sign in with Google' : 'Continue with Google'}
        />
      </div>

      {/* Role selection — only show when NOT in a customer context and NOT in provider flow */}
      {!isProviderFlow && !isCustomerContext && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or browse without signing in</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="/my-account"
              className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🐶
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-[var(--pl-teal)] transition-colors">
                    I'm a pet owner
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Saved providers, broadcasts, reviews</p>
                </div>
                <span className="text-slate-300 group-hover:text-[var(--pl-teal)] transition-colors">→</span>
              </div>
            </a>

            <a
              href="/pro"
              className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🏪
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-[var(--pl-teal)] transition-colors">
                    I'm a service provider
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Dashboard, stats, manage your listing</p>
                </div>
                <span className="text-slate-300 group-hover:text-[var(--pl-teal)] transition-colors">→</span>
              </div>
            </a>
          </div>

          <p className="text-xs text-slate-400 text-center mt-6">
            New provider?{' '}
            <a href="/join" className="text-[var(--pl-amber)] font-semibold hover:underline">
              List your service for free →
            </a>
          </p>
        </>
      )}
    </div>
  )
}
