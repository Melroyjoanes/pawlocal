'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Metadata } from 'next'

// export const metadata: Metadata = {
//   title: 'FAQs — PupStep',
//   description: 'Everything you need to know about PupStep — finding verified pet services, walk reports, care reports, and more in Juhu, Mumbai.',
// }

const EASE_EXP = [0.16, 1, 0.3, 1] as const

const FAQS: { category: string; color: string; textColor: string; icon: string; items: { q: string; a: string }[] }[] = [
  {
    category: 'General',
    color: '#FEF3C7',
    textColor: '#78350F',
    icon: '🐾',
    items: [
      {
        q: 'What is PupStep?',
        a: 'PupStep is Mumbai\'s most trusted hyperlocal pet services directory. We list manually verified dog walkers, groomers, vets, trainers, pet stores and more — all in Juhu and surrounding areas. You contact providers directly on WhatsApp. Zero booking fees, always.',
      },
      {
        q: 'Which areas does PupStep cover?',
        a: 'We currently focus on Juhu, Versova, Andheri West, and Santacruz West in Mumbai. We\'re expanding to more neighbourhoods soon. If you\'re a provider in a nearby area, get listed and we\'ll add your neighbourhood.',
      },
      {
        q: 'Is PupStep free to use?',
        a: 'Completely free for pet parents. You browse, find a provider, and WhatsApp them directly — no platform fee, no commission, no hidden charges. For providers, listing is also free.',
      },
      {
        q: 'Do I need to create an account?',
        a: 'You can browse without an account. Sign in to save care reports, track your dog\'s health history, and manage your bookings. Signing in takes under 30 seconds with Google.',
      },
    ],
  },
  {
    category: 'Walk Reports & Care Reports',
    color: '#F0FDF4',
    textColor: '#064E3B',
    icon: '📋',
    items: [
      {
        q: 'What is a care report?',
        a: 'After every walk or grooming session, your PupStep provider logs the session and sends you a care report. It includes a photo of your dog, GPS walk route, duration, poop and pee count, mood notes, and any observations. Reports are saved to your account automatically.',
      },
      {
        q: 'How do I receive my dog\'s care reports?',
        a: 'Your walker or groomer sends a report link via WhatsApp after each session. You can also sign into pupstep.in and view all reports in your account under "My Reports". Every report is saved permanently.',
      },
      {
        q: 'Can I share care reports with my vet?',
        a: 'Yes — every care report has a shareable link. Just forward it to your vet on WhatsApp or email. Vets love seeing the walk distance, poop consistency, and mood trends over time. It makes consultations much more useful.',
      },
      {
        q: 'Do all providers send care reports?',
        a: 'Dog walkers and groomers on PupStep are encouraged to send care reports via the provider dashboard. When browsing, you can see how many reports a provider has sent — providers with more reports are generally more consistent and trusted.',
      },
    ],
  },
  {
    category: 'Finding Providers',
    color: '#E0F2FE',
    textColor: '#0C4A6E',
    icon: '🔍',
    items: [
      {
        q: 'How do I find a dog walker in Juhu?',
        a: 'Visit the Dog Walking section, browse verified walkers near you, and WhatsApp any walker directly from their profile. You\'ll see their location, services, report history, and the Verified badge if they\'ve been reviewed by our team.',
      },
      {
        q: 'What does the Verified badge mean?',
        a: 'Every provider with a Verified badge has been manually reviewed by the PupStep team. We check their identity, experience, references, and track record before approving them. If they\'re listed with a Verified badge, we\'d trust them with our own dog.',
      },
      {
        q: 'Can I post a request if I can\'t find what I need?',
        a: 'Yes! Use Pet Broadcast — post your request once (e.g. "Looking for a groomer near Juhu who does home visits") and verified providers nearby will reply directly to your WhatsApp. It\'s free and takes 30 seconds.',
      },
      {
        q: 'How do I contact a provider?',
        a: 'Every provider profile has a WhatsApp button. Tap it and you\'ll go directly to a WhatsApp chat with the provider. No middleman, no booking form, no commission. Just a direct conversation.',
      },
    ],
  },
  {
    category: 'For Providers',
    color: '#F5F3FF',
    textColor: '#4C1D95',
    icon: '🦮',
    items: [
      {
        q: 'How do I get listed on PupStep?',
        a: 'Visit pupstep.in/join and fill in your profile — name, category, location, WhatsApp number, a short bio, and your services. Our team reviews every submission and gets back to you within 48 hours.',
      },
      {
        q: 'Is listing free for providers?',
        a: 'Yes, listing is completely free. We don\'t charge a monthly fee, commission, or take any percentage of your earnings. PupStep is a discovery platform — once a pet parent contacts you, everything happens between you and them directly.',
      },
      {
        q: 'How do I send care reports to my clients?',
        a: 'Sign in at pupstep.in/pro and go to your provider dashboard. After each session, log the walk or groom details — the system generates a care report and gives you a link to share with your client on WhatsApp. Takes under 2 minutes.',
      },
      {
        q: 'Will sending care reports help me get more clients?',
        a: 'Absolutely. Providers who consistently send care reports are trusted more by pet parents, appear higher in search, and get more repeat bookings. Your report count is shown on your profile — it\'s a visible trust signal.',
      },
    ],
  },
  {
    category: 'Pricing & Payments',
    color: '#FFF1F2',
    textColor: '#9F1239',
    icon: '₹',
    items: [
      {
        q: 'Does PupStep charge a booking fee?',
        a: 'Never. PupStep is a free directory. There is no booking fee, no platform commission, and no subscription required to contact providers. What you pay the provider is between you and them.',
      },
      {
        q: 'How do I pay the provider?',
        a: 'Directly to the provider — UPI, cash, bank transfer, whatever they prefer. You negotiate rates and payment methods with the provider on WhatsApp. PupStep is not involved in any financial transaction.',
      },
      {
        q: 'What are typical rates for dog walking in Mumbai?',
        a: 'Dog walking rates in Juhu and Andheri West typically range from ₹200–₹600 per walk depending on duration, number of dogs, and the walker\'s experience. Check individual profiles and discuss directly with the walker.',
      },
    ],
  },
]

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: 'rgba(0,0,0,0.07)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-slate-800 leading-snug pr-2">{q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5"
          style={{ background: isOpen ? '#0A8A96' : '#F1F5F9', color: isOpen ? '#fff' : '#64748B' }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_EXP }}
            className="overflow-hidden"
          >
            <p className="text-sm text-slate-500 leading-relaxed pb-4 pr-8">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const toggle = (key: string) =>
    setOpenMap(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="min-h-screen" style={{ background: '#FFFBEB' }}>

      {/* Hero */}
      <section className="py-14 sm:py-20 text-center px-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_EXP }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-5 rounded-full"
            style={{ background: '#FEF3C7', color: '#78350F' }}>
            🐾 Help centre
          </span>
          <h1 className="font-display text-slate-900 mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Frequently asked questions
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto" style={{ lineHeight: 1.65 }}>
            Everything you need to know about PupStep. Can&apos;t find an answer?{' '}
            <Link href="/contact" className="font-semibold underline underline-offset-2" style={{ color: '#0A8A96' }}>
              Drop us a message →
            </Link>
          </p>
        </motion.div>
      </section>

      {/* FAQ Categories */}
      <section className="pb-20 px-5 max-w-3xl mx-auto">
        <div className="space-y-6">
          {FAQS.map((section, si) => (
            <motion.div
              key={section.category}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_EXP, delay: si * 0.07 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: '1.5px solid rgba(0,0,0,0.07)', background: '#fff' }}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 px-6 py-4"
                style={{ background: section.color, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <span className="text-xl">{section.icon}</span>
                <h2 className="font-bold text-sm tracking-wide" style={{ color: section.textColor }}>
                  {section.category}
                </h2>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.08)', color: section.textColor }}>
                  {section.items.length} questions
                </span>
              </div>

              {/* Items */}
              <div className="px-6">
                {section.items.map((item, ii) => (
                  <FAQItem
                    key={ii}
                    q={item.q}
                    a={item.a}
                    isOpen={!!openMap[`${si}-${ii}`]}
                    onToggle={() => toggle(`${si}-${ii}`)}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.4 }}
          className="mt-10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
          style={{ background: 'linear-gradient(135deg, #0A2F35 0%, #0D3D45 100%)' }}
        >
          <div className="flex-1">
            <p className="font-bold text-white text-lg mb-1">Still have questions?</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Our team is available on WhatsApp and email. We usually reply within a few hours.
            </p>
          </div>
          <Link href="/contact"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: '#F59E0B', color: '#451A03' }}>
            Contact us →
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
