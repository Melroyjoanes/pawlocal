import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pet Insurance — Compare Plans | PawLocal',
  description: 'Compare the best pet insurance plans in India. Digit, Tata AIG, Bajaj Allianz and more. Find the right plan for your dog or cat.',
}

const PLANS = [
  {
    name: 'Digit Pet Insurance',
    logo: '🔵',
    tagline: 'Most popular · Covers illness, accidents & surgery',
    features: ['Vet consultation covered', 'Cashless at 5,600+ hospitals', 'No age restriction for enrolment', 'Theft & third party liability'],
    premium: '₹2,500/yr',
    url: 'https://www.godigit.com/pet-insurance',
    highlight: true,
    badge: 'Most Popular',
    color: '#2563EB',
  },
  {
    name: 'Tata AIG Pet Insurance',
    logo: '🔴',
    tagline: 'Comprehensive cover from a trusted brand',
    features: ['Accident & illness cover', 'Surgery & hospitalisation', 'Alternative treatments', 'Annual health check-up'],
    premium: '₹3,200/yr',
    url: 'https://www.tataaig.com/pet-insurance',
    highlight: false,
    badge: null,
    color: '#DC2626',
  },
  {
    name: 'Bajaj Allianz',
    logo: '🟠',
    tagline: 'Flexible plans with customisable add-ons',
    features: ['Inpatient hospitalisation', 'Accidental death cover', 'Breeding risk cover', 'Multi-pet discount'],
    premium: '₹1,800/yr',
    url: 'https://www.bajajallianz.com/pet-insurance-policy.html',
    highlight: false,
    badge: 'Budget Pick',
    color: '#EA580C',
  },
  {
    name: 'New India Assurance',
    logo: '🟢',
    tagline: 'Government-backed cover — widely trusted',
    features: ['Hospitalisation & surgery', 'Permanent disability cover', 'Cattle & exotic pets too', 'Simple claim process'],
    premium: '₹1,200/yr',
    url: 'https://www.newindia.co.in',
    highlight: false,
    badge: null,
    color: '#16A34A',
  },
]

const FAQ = [
  {
    q: 'Is pet insurance worth it in India?',
    a: 'Yes — vet bills for surgeries or serious illness can run ₹30,000–₹2,00,000+. A policy at ₹2,000–3,000/yr pays for itself after a single hospitalisation.',
  },
  {
    q: 'What is covered under a typical pet insurance plan?',
    a: 'Most plans cover illness, accidents, surgery, and hospitalisation. Premium plans add wellness visits, dental, and alternative treatments.',
  },
  {
    q: 'Can I insure my cat or exotic pet?',
    a: 'Digit and Bajaj Allianz cover cats. New India also covers exotic pets and cattle. Check the insurer\'s product page for the latest eligibility.',
  },
  {
    q: 'How do I claim?',
    a: 'Cashless claims work directly with empanelled hospitals. For reimbursement, submit the vet bills and the claim form within 30 days of treatment.',
  },
]

export default function InsurancePage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-6">
        ← Home
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">🛡️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pet Insurance</h1>
            <p className="text-sm text-gray-400">Compare top plans · India · Updated June 2026</p>
          </div>
        </div>
        <p className="text-gray-600">
          One vet emergency can cost more than a year of insurance. We've compared the top plans available in India so you can pick the right cover for your pet.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-sm text-amber-800">
        <strong>Note:</strong> PawLocal may earn a referral fee if you purchase through our links — at no extra cost to you. Prices shown are indicative; check each insurer's site for current quotes.
      </div>

      {/* Plan cards */}
      <div className="flex flex-col gap-4 mb-12">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-5 transition ${
              plan.highlight
                ? 'border-blue-200 bg-blue-50 shadow-sm'
                : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{plan.logo}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{plan.name}</h2>
                    {plan.badge && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: plan.color + '20', color: plan.color }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900">{plan.premium}</p>
                <p className="text-xs text-gray-400">starting</p>
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-1.5 mb-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={plan.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition ${
                plan.highlight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              Get a quote →
            </a>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently asked questions</h2>
        <div className="flex flex-col gap-4">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-gray-100 pb-4 last:border-0">
              <p className="font-medium text-gray-900 mb-1">{item.q}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <p className="font-semibold text-gray-900 mb-1">Need a vet first?</p>
        <p className="text-sm text-gray-500 mb-4">Find trusted vets and clinics near Juhu on PawLocal</p>
        <Link
          href="/vet"
          className="inline-block bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition"
        >
          Find a vet near me →
        </Link>
      </div>
    </div>
  )
}
