'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CLAY_SHADOW_CREAM, CLAY_SHADOW_TEAL, CLAY_SHADOW_ORANGE_SM } from '@/lib/clayShadows'

const EASE_EXP = [0.16, 1, 0.3, 1] as const

const POSTS = [
  {
    slug: 'how-to-choose-dog-walker-mumbai',
    category: 'Dog Walking',
    categoryColor: '#FEF3C7',
    categoryText: '#78350F',
    emoji: '🦮',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80',
    title: 'How to choose the right dog walker in Mumbai',
    excerpt: 'Not all dog walkers are equal. Here\'s what to look for — experience, route safety, care reports, and red flags to avoid when hiring in Juhu and Andheri.',
    readTime: '5 min read',
    date: 'Jun 10, 2026',
    featured: true,
  },
  {
    slug: 'what-is-a-care-report',
    category: 'Care Reports',
    categoryColor: '#F0FDF4',
    categoryText: '#064E3B',
    emoji: '📋',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80',
    title: 'What is a care report and why your vet will love it',
    excerpt: 'A care report captures every walk — GPS route, photo, poop count, mood. Learn how pet parents in Juhu are using reports to catch health issues early.',
    readTime: '4 min read',
    date: 'Jun 5, 2026',
    featured: false,
  },
  {
    slug: 'dog-grooming-guide-mumbai',
    category: 'Grooming',
    categoryColor: '#F5F3FF',
    categoryText: '#4C1D95',
    emoji: '✂️',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80',
    title: 'The complete dog grooming guide for Mumbai pet parents',
    excerpt: 'Mumbai\'s humidity is tough on coats. How often should you groom? What services matter most? We asked verified groomers in Juhu for their honest advice.',
    readTime: '6 min read',
    date: 'May 28, 2026',
    featured: false,
  },
  {
    slug: 'juhu-pet-community',
    category: 'Community',
    categoryColor: '#FFF1F2',
    categoryText: '#9F1239',
    emoji: '❤️',
    image: 'https://images.unsplash.com/photo-1450778869180-366b5a8ae4cf?auto=format&fit=crop&w=900&q=80',
    title: 'Inside Juhu\'s growing pet community',
    excerpt: 'From beach morning walks to weekend playdates at Carter Road — how Mumbai\'s western suburb became one of India\'s most pet-friendly neighbourhoods.',
    readTime: '7 min read',
    date: 'May 20, 2026',
    featured: false,
  },
  {
    slug: 'vet-visit-checklist-mumbai',
    category: 'Health',
    categoryColor: '#E0F2FE',
    categoryText: '#0C4A6E',
    emoji: '🏥',
    image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=900&q=80',
    title: '10 things to bring to every vet visit in Mumbai',
    excerpt: 'Vaccination records, food logs, walk history — vets in Mumbai say most pet parents come underprepared. Here\'s a simple checklist to make every visit count.',
    readTime: '4 min read',
    date: 'May 12, 2026',
    featured: false,
  },
]

const CATEGORIES = ['All', 'Dog Walking', 'Care Reports', 'Grooming', 'Health', 'Community']

export default function BlogPage() {
  const featured = POSTS[0]
  const rest = POSTS.slice(1)

  return (
    <div className="min-h-screen" style={{ background: '#FFFBEB' }}>

      {/* Hero */}
      <section className="py-14 sm:py-20 text-center px-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_EXP }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-5 rounded-full"
            style={{ background: '#FEF3C7', color: '#78350F' }}>
            🐾 PupStep journal
          </span>
          <h1 className="font-display text-slate-900 mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Stories, guides &amp; tips<br />for Mumbai pet parents
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto" style={{ lineHeight: 1.65 }}>
            Practical advice from verified providers and real pet parents in Juhu, Andheri West and beyond.
          </p>
        </motion.div>
      </section>

      <section className="pb-20 px-5 max-w-5xl mx-auto">

        {/* Featured post */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_EXP, delay: 0.1 }}
          className="mb-10"
        >
          <Link href={`/blog/${featured.slug}`} className="group block">
            <div className="rounded-3xl overflow-hidden"
              style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}>
              {/* Cover image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full object-cover"
                style={{ height: '260px' }}
              />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: featured.categoryColor, color: featured.categoryText }}>
                    {featured.category}
                  </span>
                  <span className="text-xs text-slate-400">{featured.date}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{featured.readTime}</span>
                  <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#FEF3C7', color: '#92400E' }}>✨ Featured</span>
                </div>
                <h2 className="font-display text-slate-900 mb-3 group-hover:text-amber-700 transition-colors"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.2 }}>
                  {featured.title}
                </h2>
                <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-5">{featured.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#0A8A96' }}>
                  Read article →
                </span>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE_EXP, delay: 0.15 + i * 0.07 }}
            >
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <div className="rounded-3xl overflow-hidden h-full flex flex-col"
                  style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full object-cover"
                    style={{ height: '180px' }}
                  />
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: post.categoryColor, color: post.categoryText }}>
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-400">{post.readTime}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 leading-snug mb-2 group-hover:text-amber-700 transition-colors"
                      style={{ fontSize: '0.95rem' }}>
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed flex-1">{post.excerpt}</p>
                    <div className="flex items-center justify-between mt-4 pt-4"
                      style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <span className="text-xs text-slate-400">{post.date}</span>
                      <span className="text-xs font-semibold" style={{ color: '#0A8A96' }}>Read →</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Newsletter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_EXP, delay: 0.5 }}
          className="mt-12 rounded-3xl p-6 sm:p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #0A2F35 0%, #0D3D45 100%)', boxShadow: CLAY_SHADOW_TEAL }}
        >
          <p className="text-2xl mb-2">🐾</p>
          <p className="font-bold text-white text-lg mb-1">More articles coming soon</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Written by our team and Juhu&apos;s verified pet care providers. Real advice, no fluff.
          </p>
          <Link href="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
            style={{ background: '#F59E0B', color: '#451A03', boxShadow: CLAY_SHADOW_ORANGE_SM }}>
            Suggest a topic →
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
