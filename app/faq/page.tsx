'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { CLAY_SHADOW_CREAM, CLAY_SHADOW_TEAL, CLAY_SHADOW_ORANGE_SM } from '@/lib/clayShadows'

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
        a: 'PupStep is a GPS walk reporting app for dog parents across India — we started in Mumbai and have grown from there. Every time your walker takes your dog out, they log the session through PupStep — GPS route, photo, duration, and health notes. You get a detailed report after every single walk.',
      },
      {
        q: 'Which areas does PupStep work in?',
        a: 'We started in Juhu, Versova, Andheri West, and Santacruz West in Mumbai, and today pet parents use PupStep in cities across India. Your walker can use PupStep from anywhere in the country — there\'s no location lock-in.',
      },
      {
        q: 'Is PupStep free to use?',
        a: 'Dog walkers use PupStep for free, always. For dog parents, there is a 3-day free trial when you sign up, then ₹199/month for unlimited walk reports and the full care diary.',
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
        a: 'Your walker scans the QR code from your dashboard or taps the WhatsApp link you send them — no app download, no account needed — and enters the 4-digit code that comes with it. From there it takes under a minute: tap Start Walk, walk your dog with GPS running, then add a photo and quick notes when they\'re done. The report lands in your account and on WhatsApp within seconds.',
      },
      {
        q: 'What if my walker doesn\'t send a report?',
        a: 'We do our part to make it easy: logging a walk takes under a minute, and if your walker\'s usual walk time passes with nothing logged, we send them a gentle reminder automatically. That said, we can\'t make a walker pick up their phone — sending a report is ultimately their action, not something PupStep can do for them. If one\'s missing, it almost always just means the walk hasn\'t been logged yet. A quick nudge to your walker directly is usually the fastest fix.',
      },
      {
        q: 'Can I share walk reports with my vet?',
        a: 'Yes. Every report has a shareable link you can forward to your vet on WhatsApp or email, as long as your subscription is active. Vets appreciate seeing walk frequency, distance, and health trends over time — it makes consultations sharper.',
      },
      {
        q: 'How long are reports saved?',
        a: 'Walk reports are saved permanently and nothing is ever deleted. While your subscription is active, you can scroll back through your dog\'s entire history from day one.',
      },
      {
        q: 'How do I know if my dog walker actually walked my dog?',
        a: 'This is exactly why PupStep exists. Every walk comes with a GPS route map, a photo of your dog, and quick notes from your walker — not just a text saying "walk done". You don\'t have to wonder or ask around; you can just open your report and see exactly how your furry baby\'s walk went. Think of it as reassurance, not surveillance — you\'re not checking up on anyone, you\'re just getting to see what your dog\'s walk actually looked like.',
      },
      {
        q: 'What if my walker says the walk happened but I\'m not sure?',
        a: 'A message saying "walk done" is easy to send from the couch. A GPS route on a map is much harder to fake — it shows exactly where your dog went, for how long, and when it happened. If something ever feels off, the walk report gives you something concrete to look at instead of just taking someone\'s word for it.',
      },
      {
        q: 'Is this different from apps that provide their own dog walker?',
        a: 'Yes, and it\'s the biggest difference. Apps that supply their own walker are only as reliable as whoever they send that day — if that person doesn\'t show up, the whole plan falls apart. PupStep works the other way around: keep the walker you already trust, your maid, watchman, family friend, or regular walker, and we simply let you keep a real-time check on how your furry baby did on every walk, with GPS tracking built in. There\'s no one to book and no one to replace, so there\'s no risk of a stranger not turning up. You keep the relationship you already trust; we just make it easy to check in.',
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
        a: 'Sign up at pupstep.in, add your dog\'s details (name, breed, age), then invite your walker: show them the QR code from your dashboard or send them the WhatsApp link. They enter the 4-digit code that comes with it and they\'re connected — every walk they log appears in your dashboard automatically.',
      },
      {
        q: 'What if my walker is not on PupStep yet?',
        a: 'No problem — just share your unique QR code or WhatsApp link with them from your dashboard, along with the 4-digit code shown under it. They scan or tap, enter the code, and they\'re in. It takes about 30 seconds: no app download, no account, and it\'s always free for them to use.',
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
        a: '₹199/month (cancel anytime). Dog walkers are always free.',
      },
      {
        q: 'What is included in the plan?',
        a: 'Your plan includes GPS-tagged walk logs, photo diary, grooming records, vet visit history, feeding and medication tracking, and shareable report links you can forward to your vet or family on WhatsApp.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes. You get a 3-day free trial when you first sign up. You will not be charged until the trial ends, and you can cancel before then with no questions asked.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes — cancel before your next billing date and you will not be charged again. If you cancel within 7 days of your first payment, you get a full refund.',
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
        a: 'You don\'t need an account or an app. Once you\'re connected, you get your own dashboard link — save it or bookmark it. Open it before the walk, tap Start Walk, and GPS tracks the route as you go. When you\'re done, tap End Walk, add a photo and quick notes, and the report goes straight to the dog\'s parent automatically.',
      },
      {
        q: 'How do I connect with a dog parent on PupStep?',
        a: 'The dog\'s parent invites you — they\'ll show you a QR code to scan or send you a link on WhatsApp, along with a 4-digit code. Scan or tap, enter the code, and you\'re connected in under a minute. No account, no app download, and it\'s completely free for you. After that, every walk you log goes straight to their dashboard automatically.',
      },
      {
        q: 'What if I walk dogs for multiple different pet parents?',
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
              className="rounded-3xl overflow-hidden"
              style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
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
          className="mt-10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
          style={{ background: 'linear-gradient(135deg, #0A2F35 0%, #0D3D45 100%)', boxShadow: CLAY_SHADOW_TEAL }}
        >
          <div className="flex-1">
            <p className="font-bold text-white text-lg mb-1">Still have questions?</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Our team is on WhatsApp and email. We usually reply within a few hours.
            </p>
          </div>
          <Link href="/contact"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-transform hover:opacity-90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
            style={{ background: '#F59E0B', color: '#451A03', boxShadow: CLAY_SHADOW_ORANGE_SM }}>
            Contact us →
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
