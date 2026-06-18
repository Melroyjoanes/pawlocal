'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const EASE_EXP = [0.16, 1, 0.3, 1] as const

const TOPICS = [
  'General enquiry',
  'I need help finding a provider',
  'Issue with a care report',
  'I want to get listed as a provider',
  'Partnership / press enquiry',
  'Feedback or suggestion',
  'Something else',
]

const INFO_CARDS = [
  {
    icon: '💬',
    title: 'WhatsApp',
    desc: 'Fastest way to reach us. We reply within a few hours.',
    action: 'Chat on WhatsApp',
    href: 'https://wa.me/919892620677?text=Hi%20PupStep%2C%20I%20have%20a%20question',
    color: '#F0FDF4',
    textColor: '#064E3B',
  },
  {
    icon: '📧',
    title: 'Email',
    desc: 'melroy@verfolia.com — we reply within 24 hours.',
    action: 'Send an email',
    href: 'mailto:melroy@verfolia.com',
    color: '#FEF3C7',
    textColor: '#78350F',
  },
  {
    icon: '📍',
    title: 'Location',
    desc: 'Juhu, Mumbai, Maharashtra — serving western suburbs.',
    action: null,
    href: null,
    color: '#E0F2FE',
    textColor: '#0C4A6E',
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#FFFBEB' }}>

      {/* Hero */}
      <section className="py-14 sm:py-20 text-center px-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_EXP }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-5 rounded-full"
            style={{ background: '#FEF3C7', color: '#78350F' }}>
            🐾 Get in touch
          </span>
          <h1 className="font-display text-slate-900 mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            We&apos;d love to hear<br />from you
          </h1>
          <p className="text-slate-500 text-lg max-w-lg mx-auto" style={{ lineHeight: 1.65 }}>
            Whether you&apos;re a pet parent, a provider, or a press enquiry — we reply to every message.
          </p>
        </motion.div>
      </section>

      <section className="pb-20 px-5 max-w-5xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — info cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {INFO_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.42, ease: EASE_EXP, delay: 0.1 + i * 0.08 }}
                className="rounded-2xl p-5"
                style={{ background: card.color, border: '1.5px solid rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm mb-1" style={{ color: card.textColor }}>{card.title}</p>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: card.textColor + 'AA' }}>{card.desc}</p>
                    {card.action && card.href && (
                      <a href={card.href} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2"
                        style={{ color: card.textColor }}>
                        {card.action} →
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Response time badge */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_EXP, delay: 0.4 }}
              className="rounded-2xl p-5 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #0A2F35, #0D3D45)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-bold text-white text-sm">Usually under 4 hours</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Mon–Sat, 9 am – 8 pm IST</p>
              </div>
            </motion.div>
          </div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_EXP, delay: 0.15 }}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl p-6 sm:p-8"
              style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.07)' }}>

              {state === 'sent' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
                    style={{ background: '#F0FDF4' }}>
                    ✅
                  </motion.div>
                  <h3 className="font-bold text-slate-900 text-xl mb-2">Message sent!</h3>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Thanks, {form.name.split(' ')[0]}! We&apos;ve got your message and will reply to <strong>{form.email}</strong> within a few hours.
                  </p>
                  <button onClick={() => { setForm({ name: '', email: '', topic: '', message: '' }); setState('idle') }}
                    className="mt-6 text-sm font-semibold underline underline-offset-2" style={{ color: '#0A8A96' }}>
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <p className="font-bold text-slate-900 text-lg mb-1">Send us a message</p>
                    <p className="text-sm text-slate-400">We read and reply to every message personally.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your name <span className="text-red-400">*</span></label>
                      <input
                        type="text" value={form.name} onChange={set('name')} placeholder="Priya Sharma"
                        required
                        className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all"
                        style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}
                        onFocus={e => (e.target.style.borderColor = '#0A8A96')}
                        onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address <span className="text-red-400">*</span></label>
                      <input
                        type="email" value={form.email} onChange={set('email')} placeholder="priya@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all"
                        style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}
                        onFocus={e => (e.target.style.borderColor = '#0A8A96')}
                        onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">What&apos;s it about?</label>
                    <select
                      value={form.topic} onChange={set('topic')}
                      className="w-full px-4 py-3 rounded-xl text-sm text-slate-700 outline-none transition-all"
                      style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}
                      onFocus={e => (e.target.style.borderColor = '#0A8A96')}
                      onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                    >
                      <option value="">Select a topic</option>
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message <span className="text-red-400">*</span></label>
                    <textarea
                      value={form.message} onChange={set('message')} placeholder="Tell us what's on your mind…"
                      required rows={5}
                      className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all resize-none"
                      style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}
                      onFocus={e => (e.target.style.borderColor = '#0A8A96')}
                      onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>

                  {state === 'error' && (
                    <p className="text-xs text-red-500 font-medium">
                      Something went wrong. Try again or WhatsApp us directly.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={state === 'sending'}
                    className="w-full py-3.5 rounded-xl font-bold text-sm transition-opacity disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0A8A96, #065A67)', color: '#F0FDFA' }}
                  >
                    {state === 'sending' ? 'Sending…' : 'Send message →'}
                  </button>

                  <p className="text-xs text-center text-slate-400">
                    Or WhatsApp us directly at{' '}
                    <a href="https://wa.me/919892620677" target="_blank" rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-1" style={{ color: '#16a34a' }}>
                      +91 98926 20677
                    </a>
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
