import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pet Insurance in Mumbai | PupStep',
  description: 'Compare and buy pet insurance for your dog or cat in Mumbai. Health, accident, and wellness cover from trusted Indian insurers.',
}

export default function InsurancePage() {
  return (
    <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>
      {/* Hero section */}
      <div className="max-w-lg mx-auto px-4 pt-8 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--pl-teal)' }}>
          Pet Insurance
        </p>
        <h1 className="font-display text-[2.2rem] leading-[1.1] text-slate-900 mb-3">
          Protect your pet,<br />peace of mind for you.
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Vet bills in Mumbai can be expensive. Pet insurance covers accidents, illnesses, surgeries, and more — so you never have to choose between cost and care.
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Why insurance card */}
        <div className="rounded-2xl p-5" style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
          border: '1px solid rgba(226,220,200,0.7)',
        }}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">What&apos;s covered</p>
          <div className="space-y-2.5">
            {[
              { icon: '🏥', title: 'Vet visits & hospitalisation', desc: 'Indoor treatment, surgeries, specialist consults' },
              { icon: '🚑', title: 'Accidents & emergencies', desc: 'Fractures, poisoning, accidental injuries' },
              { icon: '💊', title: 'Medication & diagnostics', desc: 'Blood tests, X-rays, prescribed medicines' },
              { icon: '🛡️', title: 'Third-party liability', desc: 'If your pet injures someone or damages property' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 items-start">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price card */}
        <div className="rounded-2xl p-5" style={{
          background: 'linear-gradient(160deg, oklch(0.48 0.17 196 / 0.06) 0%, oklch(0.48 0.17 196 / 0.02) 100%)',
          border: '1px solid oklch(0.48 0.17 196 / 0.2)',
        }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--pl-teal)' }}>Typical cost</p>
          <p className="font-display text-3xl text-slate-900 mb-1">₹3,000 – ₹8,000</p>
          <p className="text-xs text-slate-500">per year for most dogs in Mumbai. Cats are typically lower.</p>
        </div>

        {/* CTA */}
        <a
          href="https://wa.me/917977335733?text=Hi%20PawLocal!%20I'm%20interested%20in%20pet%20insurance%20for%20my%20pet%20in%20Juhu."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base"
          style={{
            background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
            boxShadow: '0 4px 0px oklch(0.35 0.14 196), 0 8px 24px oklch(0.48 0.17 196 / 0.3)',
          }}
        >
          <span>💬</span>
          Get a free quote on WhatsApp
        </a>

        <p className="text-center text-xs text-slate-400 pb-4">
          We partner with licensed Indian insurers. PawLocal earns a referral fee — this never affects your premium.
        </p>
      </div>
    </div>
  )
}
