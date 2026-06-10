'use client'

import { useState } from 'react'

interface Props {
  tier: 'verified' | 'certified'
}

const TIERS = [
  {
    key: 'contacted',
    label: 'Listed',
    description: 'Provider has submitted their listing. Basic information confirmed.',
  },
  {
    key: 'verified',
    label: 'Verified',
    description: 'Our team has spoken with this provider and confirmed their services, location, and contact details.',
  },
  {
    key: 'certified',
    label: 'PupStep Certified',
    description: 'Our team has personally visited, reviewed credentials, and certifies this provider meets our quality standards.',
  },
]

export default function TierExplainer({ tier }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        {open ? 'Hide details' : 'What does this mean?'}
      </button>
      {open && (
        <div className="mt-3 border border-border rounded-xl p-4 bg-white flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            PawLocal verification levels
          </p>
          {TIERS.map((t) => {
            const isActive = t.key === tier || (t.key === 'contacted' && tier === 'verified') || (t.key !== 'certified' && tier === 'certified')
            return (
              <div key={t.key} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    t.key === tier ? 'bg-amber-400' : isActive ? 'bg-stone-300' : 'bg-stone-200'
                  }`}
                />
                <div>
                  <p className={`text-xs font-semibold ${t.key === tier ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
