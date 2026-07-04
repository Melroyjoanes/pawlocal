'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Lang = 'en' | 'hi' | 'mr'

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  en: {
    pageTitle: 'How PupStep Works for Walkers 🐾',
    subtitle: 'Simple steps to log every walk perfectly.',
    openLinkTitle: 'Open the dashboard link',
    openLinkBody: 'Tap the WhatsApp link to open your walking dashboard. Bookmark it so you can always find it again.',
    startWalkTitle: 'Tap Start Walk',
    startWalkBody: 'When you leave with the dog, tap the big orange Start Walk button. GPS tracking begins automatically.',
    logTitle: 'Log pee & poop',
    logBody: 'During the walk, tap 💧 when the dog pees and 💩 when it poops. You can add a quick photo for poop too.',
    photoTitle: 'End Walk + dog photo',
    photoBody: "Tap End Walk when you're done. Take a photo of the dog — parents love seeing their pet right after a walk!",
    reportTitle: 'Report sent automatically',
    reportBody: 'The walk report goes out on its own — GPS route, photos, pee/poop count, and mood. Nothing else to do.',
    ctaTitle: 'Ready to start walking?',
    ctaBody: 'Open your dashboard link to begin — no app download needed.',
    shareLabel: 'Share this guide with your walker',
    shareBody: 'Send this page so they always know how PupStep works.',
    shareButton: 'Share guide',
    copyButton: 'Copy link',
    copiedButton: 'Copied!',
  },
  hi: {
    pageTitle: 'PupStep वॉकर्स के लिए कैसे काम करता है 🐾',
    subtitle: 'हर वॉक को सही तरीके से लॉग करने के आसान स्टेप्स।',
    openLinkTitle: 'डैशबोर्ड लिंक खोलें',
    openLinkBody: 'अपना वॉकिंग डैशबोर्ड खोलने के लिए WhatsApp लिंक पर टैप करें। इसे बुकमार्क कर लें ताकि आप इसे हमेशा दोबारा ढूंढ सकें।',
    startWalkTitle: '"Start Walk" पर टैप करें',
    startWalkBody: 'जब आप कुत्ते के साथ निकलें, बड़े नारंगी Start Walk बटन पर टैप करें। GPS ट्रैकिंग अपने आप शुरू हो जाती है।',
    logTitle: 'पेशाब और पॉटी लॉग करें',
    logBody: 'वॉक के दौरान, कुत्ता पेशाब करे तो 💧 और पॉटी करे तो 💩 टैप करें। पॉटी के लिए एक झटपट फोटो भी जोड़ सकते हैं।',
    photoTitle: 'Walk समाप्त करें + कुत्ते की फोटो',
    photoBody: 'जब आप पूरा कर लें तो End Walk पर टैप करें। कुत्ते की एक फोटो लें — माता-पिता को वॉक के तुरंत बाद अपने पालतू को देखना बहुत पसंद है!',
    reportTitle: 'रिपोर्ट अपने आप भेज दी जाती है',
    reportBody: 'वॉक रिपोर्ट खुद-ब-खुद भेज दी जाती है — GPS रूट, फोटो, पेशाब/पॉटी की गिनती, और मूड। और कुछ करने की जरूरत नहीं।',
    ctaTitle: 'चलने के लिए तैयार हैं?',
    ctaBody: 'शुरू करने के लिए अपना डैशबोर्ड लिंक खोलें — किसी ऐप डाउनलोड की जरूरत नहीं।',
    shareLabel: 'यह गाइड अपने वॉकर के साथ शेयर करें',
    shareBody: 'यह पेज भेजें ताकि उन्हें हमेशा पता रहे PupStep कैसे काम करता है।',
    shareButton: 'गाइड शेयर करें',
    copyButton: 'लिंक कॉपी करें',
    copiedButton: 'कॉपी हो गया!',
  },
  mr: {
    pageTitle: 'PupStep वॉकर्ससाठी कसे काम करते 🐾',
    subtitle: 'प्रत्येक वॉक अचूक लॉग करण्यासाठी सोप्या स्टेप्स.',
    openLinkTitle: 'डॅशबोर्ड लिंक उघडा',
    openLinkBody: 'तुमचा वॉकिंग डॅशबोर्ड उघडण्यासाठी WhatsApp लिंकवर टॅप करा. ती बुकमार्क करा जेणेकरून तुम्हाला ती नेहमी परत सापडेल.',
    startWalkTitle: '"Start Walk" वर टॅप करा',
    startWalkBody: 'कुत्र्यासोबत निघताना मोठ्या नारंगी Start Walk बटणावर टॅप करा. GPS ट्रॅकिंग आपोआप सुरू होते.',
    logTitle: 'लघवी आणि शौच नोंदवा',
    logBody: 'चालताना, कुत्रा लघवी करेल तेव्हा 💧 आणि शौच करेल तेव्हा 💩 टॅप करा. शौचासाठी झटपट फोटोही जोडता येतो.',
    photoTitle: 'Walk संपवा + कुत्र्याचा फोटो',
    photoBody: 'पूर्ण झाल्यावर End Walk वर टॅप करा. कुत्र्याचा फोटो काढा — वॉक झाल्यावर लगेच आपला लाडका दिसताना पालकांना खूप आवडतो!',
    reportTitle: 'अहवाल आपोआप पाठवला जातो',
    reportBody: 'वॉक अहवाल स्वतःहून पाठवला जातो — GPS मार्ग, फोटो, लघवी/शौचाची संख्या आणि मूड. आणखी काही करण्याची गरज नाही.',
    ctaTitle: 'चालण्यासाठी तयार आहात?',
    ctaBody: 'सुरू करण्यासाठी तुमची डॅशबोर्ड लिंक उघडा — कोणतेही अ‍ॅप डाउनलोड करण्याची गरज नाही.',
    shareLabel: 'ही गाइड तुमच्या वॉकरसोबत शेअर करा',
    shareBody: 'हे पान पाठवा जेणेकरून त्यांना नेहमी कळेल PupStep कसे काम करते.',
    shareButton: 'गाइड शेअर करा',
    copyButton: 'लिंक कॉपी करा',
    copiedButton: 'कॉपी झाली!',
  },
} as const

// Steps config — emoji and step numbers are language-agnostic
const STEPS: { emoji: string; titleKey: keyof typeof T.en; bodyKey: keyof typeof T.en }[] = [
  { emoji: '🔗', titleKey: 'openLinkTitle', bodyKey: 'openLinkBody' },
  { emoji: '🟠', titleKey: 'startWalkTitle', bodyKey: 'startWalkBody' },
  { emoji: '💧💩', titleKey: 'logTitle', bodyKey: 'logBody' },
  { emoji: '📸', titleKey: 'photoTitle', bodyKey: 'photoBody' },
  { emoji: '✅', titleKey: 'reportTitle', bodyKey: 'reportBody' },
]

export default function WalkerGuideClient({ token }: { token?: string } = {}) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('en')
  const [copied, setCopied] = useState(false)
  const t = T[lang]

  async function handleShare() {
    const shareData = {
      title: 'PupStep — Walker Guide',
      text: t.shareBody,
      url: typeof window !== 'undefined' ? window.location.href : '',
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await handleCopy()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      void 0
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* Standalone header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'rgba(255,251,235,0.97)', backdropFilter: 'blur(10px)', borderBottom: '1px solid oklch(0.906 0.06 88)' }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Back button — if we arrived with the walker's own token (from their
              dashboard's "Need GPS help?" link), go straight back to that dashboard.
              Browser history is unreliable if the guide was opened in a new tab or
              from a bookmark, so router.back() is only a fallback for the
              parent-facing entry points that don't pass a token. */}
          {token ? (
            <Link
              href={`/walker/${token}`}
              aria-label="Go back"
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#0A2F35',
                boxShadow: '0 1px 0 rgba(0,0,0,0.05), 0 4px 12px -2px rgba(10,47,53,0.12)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#0A2F35',
                boxShadow: '0 1px 0 rgba(0,0,0,0.05), 0 4px 12px -2px rgba(10,47,53,0.12)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Logo */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="PupStep" style={{ height: 26, width: 'auto' }} />
          </div>

          {/* Language toggle — segmented pill */}
          <div
            className="flex items-center gap-0.5 ml-auto"
            style={{ background: 'rgba(10,47,53,0.06)', borderRadius: 999, padding: 3 }}
          >
            {(['en', 'hi', 'mr'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className="px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: lang === l ? 'oklch(0.48 0.17 196)' : 'transparent',
                  color: lang === l ? '#ffffff' : '#4B5563',
                  fontFamily: 'var(--font-nunito)',
                  boxShadow: lang === l ? '0 2px 6px rgba(10,47,53,0.18)' : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                {l === 'en' ? 'EN' : l === 'hi' ? 'हि' : 'म'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 pt-6 pb-16 flex flex-col gap-4 w-full">
        {/* Page title */}
        <div className="text-center mb-2">
          <h1
            className="text-2xl font-bold text-[#0A2F35] leading-tight"
            style={{ fontFamily: 'var(--font-fredoka)' }}
          >
            {t.pageTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Share card — framed for the parent use case */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.07)' }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,140,82,0.12)', fontSize: 20 }}
          >
            📤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
              {t.shareLabel}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{t.shareBody}</p>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-transform active:scale-95"
            style={{
              background: copied ? '#22c55e' : '#FF8C52',
              color: '#ffffff',
              fontFamily: 'var(--font-nunito)',
              transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            {copied ? t.copiedButton : t.shareButton}
          </button>
        </div>

        {/* Step cards */}
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.07)] p-5 flex gap-4 items-start"
          >
            {/* Step number pill */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'oklch(0.48 0.17 196)' }}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-px flex-1 min-h-[24px]" style={{ background: '#E5E7EB' }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 28, lineHeight: 1 }}>{step.emoji}</span>
                <h2
                  className="text-base font-bold text-[#0A2F35]"
                  style={{ fontFamily: 'var(--font-fredoka)' }}
                >
                  {t[step.titleKey]}
                </h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t[step.bodyKey]}
              </p>
            </div>
          </div>
        ))}

        {/* CTA */}
        <div
          className="rounded-2xl p-5 text-center mt-2"
          style={{ background: 'oklch(0.48 0.17 196)', color: '#ffffff' }}
        >
          <p className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-fredoka)' }}>
            {t.ctaTitle}
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {t.ctaBody}
          </p>
        </div>
      </main>
    </div>
  )
}
