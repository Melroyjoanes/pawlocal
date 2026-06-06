import Link from 'next/link'

interface Props {
  searchParams: Promise<{ name?: string }>
}

const TIMELINE = [
  {
    icon: '✓',
    label: 'Application submitted',
    description: 'Your listing is in our review queue. Your Google account is already linked.',
    done: true,
  },
  {
    icon: '○',
    label: 'Under review',
    description: 'Our team reviews every listing manually — usually within 24 hours.',
    done: false,
  },
  {
    icon: '○',
    label: 'You get an email',
    description: "We'll email you the moment your profile goes live.",
    done: false,
  },
  {
    icon: '○',
    label: 'Access your dashboard',
    description: 'Visit pawlocal.in/dashboard — you\'ll land straight on your profile. No extra steps.',
    done: false,
  },
]

export default async function JoinSuccessPage({ searchParams }: Props) {
  const { name } = await searchParams
  const displayName = name ? decodeURIComponent(name) : null

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-5"
          style={{ background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)' }}
        >
          <span role="img" aria-label="party">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Application received{displayName ? `, ${displayName}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your listing is now in our review queue. We review every submission manually to keep the directory trustworthy.
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          What happens next
        </p>
        <div className="flex flex-col gap-0">
          {TIMELINE.map((step, i) => (
            <div key={i} className="flex gap-4">
              {/* Step indicator + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-stone-100 text-stone-400 border border-border'
                  }`}
                >
                  {step.done ? step.icon : (i + 1)}
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[20px]" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 flex-1 ${i === TIMELINE.length - 1 ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold leading-snug ${step.done ? 'text-emerald-700' : 'text-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* While you wait */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          While you wait
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/dog-walking"
            className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-stone-50 border border-border hover:border-[var(--pl-teal)] hover:bg-white transition-all group"
          >
            <span className="text-sm font-medium text-foreground">Browse other providers</span>
            <span className="text-muted-foreground group-hover:text-[var(--pl-teal)] transition-colors text-sm">→</span>
          </Link>
          <div className="py-2.5 px-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-semibold text-amber-800 mb-1">About verification tiers</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Once approved, your listing starts as <strong>Listed</strong>. After our team speaks with you, you become <strong>Verified</strong>. After an in-person review, you can earn <strong>PawLocal Certified</strong> status — the highest trust badge on the directory.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
