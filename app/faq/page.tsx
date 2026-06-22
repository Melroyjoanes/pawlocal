'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const EASE_EXP = [0.16, 1, 0.3, 1] as const

const FAQS: { category: string; color: string; textColor: string; icon: string; items: { q: string; a: string }[] }[] = [
  {
    category: 'About PupStep',
    color: '#FEF3C7',
    textColor: '#78350F',
    icon: '🐾',
    items: [
      {
        q: 'What is PupStep?',
        a: 'PupStep is a GPS walk reporting app for Mumbai dog parents. Every time your walker takes your dog out, they log the session through PupStep — GPS route, photo, duration, and health notes. You get a detailed report after every single walk.',
      },
      {
        q: 'Which areas does PupStep work in?',
        a: 'We focus on Juhu, Versova, Andheri West, and Santacruz West in Mumbai. Your walker can use PupStep from anywhere in the city, and we\'re expanding coverage as we grow.',
      },
      {
        q: 'Is PupStep free to use?',
        a: 'Dog walkers use PupStep for free, always. For dog parents, there is a free trial when you sign up, followed by ₹249/month or ₹1,999/year for unlimited walk reports and the full care diary.',
      },
      {
        q: 'Do I need to create an account?',
        a: 'Yes — you sign in once and all your dog\'s walk reports are saved automatically to your account. Sign in takes under 30 seconds with your phone number or Google.',
      },
    ],
  },
  {
    category: 'GPS Walk Reports',
    color: '#F0FDF4',
    textColor: '#064E3B',
    icon: '📍',
    items: [
      {
        q: 'What is a GPS walk report?',
        a: 'A GPS walk report is a detailed log of your dog\'s walk, created by your walker after every session. It includes the GPS route map, walk duration, a photo of your dog, poop and pee count, mood notes, and any observations. Every report is saved permanently to your dog\'s profile.',
      },
      {
        q: 'How does my walker send the report?',
        a: 'Your walker logs the walk from their PupStep dashboard at pupstep.in/pro. It takes under 2 minutes — they tap start, walk your dog with GPS running, then add a photo and quick notes when they\'re done. The report appears in your account instantly.',
      },
      {
        q: 'Can I share walk reports with my vet?',
        a: 'Yes. Every report has a permanent shareable link. Forward it to your vet on WhatsApp or email. Vets appreciate seeing walk frequency, distance, and health trends over time — it makes consultations sharper.',
      },
      {
        q: 'How long are reports saved?',
        a: 'Walk reports are saved permanently. You can scroll back through your dog\'s entire history from day one. Nothing is ever deleted.',
      },
    ],
  },
  {
    category: 'For Dog Parents',
    color: '#E0F2FE',
    textColor: '#0C4A6E',
    icon: '🏠',
    items: [
      {
        q: 'How do I get started?',
        a: 'Sign up at pupstep.in, add your dog\'s details (name, breed, age), and share the walker setup link with your dog walker. Once they connect, their walk logs automatically appear in your dashboard.',
      },
      {
        q: 'What if my walker is not on PupStep yet?',
        a: 'Ask them to create a free walker account at pupstep.in/pro — it takes 5 minutes to set up and costs them nothing, ever. Most walkers are happy to use it once they see how quick the logging is.',
      },
      {
        q: 'Can I have multiple dogs on one account?',
        a: 'Yes. Add as many dogs as you have under a single account. Walk reports are tagged to each dog individually so you can track each one separately.',
      },
      {
        q: 'What do I see in my PupStep dashboard?',
        a: 'Your home screen shows a live feed of recent walk reports, today\'s activity, and quick stats. You can also view the full care diary — grooming records, vet visits, feeding logs, and medication history — all in one place.',
      },
    ],
  },
  {
    category: 'Pricing & Plans',
    color: '#FFF1F2',
    textColor: '#9F1239',
    icon: '₹',
    items: [
      {
        q: 'How much does PupStep cost?',
        a: '₹249/month (cancel anytime) or ₹1,999/year — that\'s 2 months free, saving you ₹990. Dog walkers are always free.',
      },
      {
        q: 'What is included in the plan?',
        a: 'All plans include GPS-tagged walk logs, photo diary, grooming records, vet visit history, and feeding and medication tracker. The Annual plan also unlocks vet-ready health PDFs you can download and share.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes. You get a free trial when you first sign up. You will not be charged anything until the trial period ends, and you can cancel before then with no questions asked.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Monthly plans can be cancelled before the next billing date. Annual plans get a full refund within 7 days of purchase, and a pro-rated refund after that. No hoops to jump through.',
      },
    ],
  },
  {
    category: 'For Dog Walkers',
    color: '#F5F3FF',
    textColor: '#4C1D95',
    icon: '🦮',
    items: [
      {
        q: 'Is PupStep free for dog walkers?',
        a: 'Completely free. Always. Walkers never pay anything to use PupStep — not now, not ever. The subscription is only for dog parents.',
      },
      {
        q: 'How do I send a walk report to my client?',
        a: 'Sign in at pupstep.in/pro and go to your walker dashboard. After each walk, log the session with GPS route, a photo, and quick notes. The report generates in seconds and goes straight to your client\'s PupStep account.',
      },
      {
        q: 'How do I connect with a dog parent on PupStep?',
        a: 'Share your walker profile link with your client. Once they sign up and add their dog, they connect it to your walker profile. After that, every walk you log goes straight to their dashboard automatically.',
      },
      {
        q: 'What if I walk dogs for multiple different owners?',
        a: 'Each client has their own PupStep account. When you log a walk for a specific dog, the report automatically goes to that dog\'s parent. You can manage all your clients from one dashboard.',
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
          style={{ background: isOpen ? 'oklch(0.48 0.17 196)' : '#F1F5F9', color: isOpen ? '#fff' : '#64748B' }}
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
            <Link href="/contact" className="font-semibold underline underline-offset-2" style={{ color: 'oklch(0.48 0.17 196)' }}>
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
              Our team is on WhatsApp and email. We usually reply within a few hours.
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
