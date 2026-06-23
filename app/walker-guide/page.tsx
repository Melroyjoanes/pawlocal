'use client'

import { useState } from 'react'

type Lang = 'en' | 'hi' | 'mr'

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  en: {
    pageTitle: 'How PupStep Works for Walkers 🐾',
    openLinkTitle: 'Open your link',
    openLinkBody: 'Open the link your owner sent you on WhatsApp. Bookmark it so you can always come back.',
    startWalkTitle: 'Tap "Start Walk"',
    startWalkBody: 'When you leave with the dog, tap the big orange Start Walk button. GPS tracking starts automatically.',
    logTitle: 'Log pee & poop',
    logBody: 'During the walk, tap 💧 when the dog pees and 💩 when it poops. For poop, you can take a quick photo too.',
    photoTitle: 'End Walk + Dog photo',
    photoBody: 'Tap End Walk when done. Take a photo of the dog — the owner loves seeing their pet after a walk!',
    reportTitle: 'Report sent automatically',
    reportBody: 'The report goes straight to the owner — GPS route, photos, poop count, and dog\'s mood. No extra steps.',
    ctaTitle: 'Ready to start walking?',
    ctaBody: 'Your owner sent you a WhatsApp link — open that link to start walking!',
  },
  hi: {
    pageTitle: 'PupStep वॉकर्स के लिए कैसे काम करता है 🐾',
    openLinkTitle: 'अपनी लिंक खोलें',
    openLinkBody: 'जो लिंक मालिक ने भेजी है उसे खोलें। बुकमार्क करें ताकि हमेशा वापस आ सकें।',
    startWalkTitle: '"Start Walk" टैप करें',
    startWalkBody: 'जब कुत्ते के साथ निकलें, बड़े नारंगी \'Start Walk\' बटन पर टैप करें। GPS अपने आप शुरू हो जाएगा।',
    logTitle: 'पेशाब और पॉटी लॉग करें',
    logBody: 'चलने के दौरान, जब कुत्ता पेशाब करे तो 💧 और पॉटी करे तो 💩 टैप करें। पॉटी की फोटो भी ले सकते हैं।',
    photoTitle: 'Walk समाप्त करें + फोटो लें',
    photoBody: 'समाप्त होने पर \'End Walk\' टैप करें। कुत्ते की फोटो लें — मालिक को देखना पसंद है!',
    reportTitle: 'रिपोर्ट अपने आप भेजी जाती है',
    reportBody: 'रिपोर्ट सीधे मालिक के पास जाती है — GPS रूट, फोटो, पॉटी की गिनती और मूड। कुछ और करने की जरूरत नहीं।',
    ctaTitle: 'चलने के लिए तैयार हैं?',
    ctaBody: 'मालिक ने आपको WhatsApp लिंक भेजी है — चलना शुरू करने के लिए वह लिंक खोलें!',
  },
  mr: {
    pageTitle: 'PupStep वॉकर्ससाठी कसे काम करते 🐾',
    openLinkTitle: 'तुमची लिंक उघडा',
    openLinkBody: 'मालकाने पाठवलेली लिंक उघडा. बुकमार्क करा जेणेकरून नेहमी परत येता येईल.',
    startWalkTitle: '"Start Walk" टॅप करा',
    startWalkBody: 'कुत्र्यासोबत निघताना मोठ्या नारंगी \'Start Walk\' बटणावर टॅप करा. GPS आपोआप सुरू होतो.',
    logTitle: 'लघवी आणि शौच नोंदवा',
    logBody: 'चालताना, कुत्रा लघवी करेल तेव्हा 💧 आणि शौच करेल तेव्हा 💩 टॅप करा. शौचाचा फोटो देखील काढता येतो.',
    photoTitle: 'Walk संपवा + कुत्र्याचा फोटो',
    photoBody: 'संपल्यावर \'End Walk\' टॅप करा. कुत्र्याचा फोटो काढा — मालकाला आवडतो!',
    reportTitle: 'अहवाल आपोआप पाठवला जातो',
    reportBody: 'अहवाल थेट मालकाकडे जातो — GPS मार्ग, फोटो, शौचाची संख्या आणि मूड. इतर काही करण्याची गरज नाही.',
    ctaTitle: 'चालण्यासाठी तयार आहात?',
    ctaBody: 'मालकाने तुम्हाला WhatsApp लिंक पाठवली आहे — चालणे सुरू करण्यासाठी ती लिंक उघडा!',
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

export default function WalkerGuidePage() {
  const [lang, setLang] = useState<Lang>('en')
  const t = T[lang]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* Standalone header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'rgba(255,251,235,0.97)', borderBottom: '1px solid oklch(0.906 0.06 88)' }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <span
            className="text-xl font-bold text-[#0A2F35]"
            style={{ fontFamily: 'var(--font-fredoka)' }}
          >
            PupStep 🐾
          </span>
          {/* Language toggle */}
          <div className="flex items-center gap-1.5">
            {(['en', 'hi', 'mr'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className="px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: lang === l ? 'oklch(0.48 0.17 196)' : 'rgba(0,0,0,0.06)',
                  color: lang === l ? '#ffffff' : '#4B5563',
                  fontFamily: 'var(--font-nunito)',
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
          <p className="text-sm text-gray-500 mt-1">Simple steps to log every walk perfectly.</p>
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
