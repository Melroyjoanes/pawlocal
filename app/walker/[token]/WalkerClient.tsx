'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { parseCareFocus } from '@/lib/careFocus'
import { LoadingButton } from '@/components/LoadingButton'
import { loadGoogleMaps } from '@/lib/googleMapsLoader'
import { SNAP_MAP_STYLE } from '@/lib/snapMapStyle'

// ── This screen is used mid-walk by walkers on modest Android phones, often
// outdoors and one-handed — it intentionally does NOT use the claymorphism
// look from lib/clayShadows (that's reserved for the parent-facing brand
// surfaces). Flat white background, plain borders, no decorative shadow.
// Every CLAY_SHADOW_* name below is kept so the ~80 call sites throughout
// this file don't need touching — they all now resolve to "no shadow."
const CLAY_SHADOW_CREAM = ''
const CLAY_SHADOW_TEAL = ''
const CLAY_SHADOW_ORANGE = ''
const CLAY_SHADOW_ORANGE_SM = ''
const CLAY_SHADOW_TEAL_OUTLINE = ''
const CLAY_SHADOW_WHATSAPP = ''
const CLAY_SHADOW_TEAL_ACCENT = ''
const CLAY_SHADOW_AMBER = ''
const CLAY_SHADOW_ORANGE_BANNER = ''
const CLAY_SHADOW_GREEN_SUCCESS = ''
const CLAY_SHADOW_BLUE = ''
const CLAY_SHADOW_RED = ''
const CLAY_SHADOW_RED_BANNER = ''
const CLAY_SHADOW_NEUTRAL = ''

// ─── Motion tokens — mirrors components/LandingPage.tsx so walker-facing
// motion feels consistent with the rest of the app ────────────────────────────
const EASE_EXP = [0.16, 1, 0.3, 1] as const
const SPRING = { type: 'spring', duration: 0.45, bounce: 0 } as const

function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Best-effort in-app-browser detection. These stripped-down WebViews (opened
// when a walker taps a link directly inside another app instead of their
// real browser) are the single most likely cause of GPS tracking dropping
// out repeatedly mid-walk — they often don't honor the Wake Lock API even
// when it appears to be supported, and get suspended by the OS far more
// aggressively than a real Chrome/Safari tab. Not every in-app browser
// leaves a detectable signature (WhatsApp's Android WebView notably does
// not reliably), so this catches what it can (Facebook/Messenger,
// Instagram, Line, Twitter/X) — a real fix for the undetectable cases is
// the general "keep this screen on" guidance shown regardless.
function detectInAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return 'Facebook'
  if (/Instagram/.test(ua)) return 'Instagram'
  if (/Line\//.test(ua)) return 'Line'
  if (/Twitter/.test(ua)) return 'Twitter/X'
  return null
}

// ── "Something is happening" live indicator — a gentle breathing dot used
// wherever we need to signal "walk in progress / recording". Isolated in its
// own memoized component so the continuous loop never re-renders the rest of
// the page. Animates opacity only (no layout properties) to stay cheap on
// low-end Android phones. ──────────────────────────────────────────────────────
const LivePulseDot = memo(function LivePulseDot({ color = '#22c55e' }: { color?: string }) {
  const rm = useReducedMotion()
  if (rm) {
    return <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
  }
  return (
    <motion.span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: color }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
})

// ── Live map shown to walker during walk ──────────────────────────────────────
function LiveMap({
  currentPos,
  routePointsRef,
  poopEvents,
  peeEvents,
}: {
  currentPos: { lat: number; lng: number } | null
  routePointsRef: React.RefObject<{ lat: number; lng: number }[]>
  poopEvents: { lat: number; lng: number; ts: string }[]
  peeEvents: { lat: number; lng: number; ts: string }[]
}) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const posMarkerRef = useRef<google.maps.Marker | null>(null)
  const eventMarkersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    function initMap() {
      if (!mapDivRef.current) return
      const center = currentPos ?? { lat: 19.098, lng: 72.827 } // Juhu, Mumbai default
      const gm = (window as { google?: { maps: typeof google.maps } }).google!.maps

      const map = new gm.Map(mapDivRef.current, {
        center,
        zoom: 17,
        disableDefaultUI: true,
        styles: SNAP_MAP_STYLE,
      })
      mapRef.current = map

      polylineRef.current = new gm.Polyline({
        geodesic: true,
        strokeColor: '#0f766e',
        strokeOpacity: 1,
        strokeWeight: 5,
        map,
      })

      posMarkerRef.current = new gm.Marker({
        position: center,
        map,
        zIndex: 10,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#0f766e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      })
    }

    loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
      .then(initMap)
      .catch(err => console.error('[WalkerClient] failed to load Google Maps', err))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pan + update route on every new GPS point
  useEffect(() => {
    if (!mapRef.current || !currentPos) return
    posMarkerRef.current?.setPosition(currentPos)
    polylineRef.current?.setPath(routePointsRef.current ?? [])
    mapRef.current.panTo(currentPos)
  }, [currentPos, routePointsRef])

  // Add poop/pee markers when events change
  useEffect(() => {
    if (!mapRef.current) return
    const gm = (window as { google?: { maps: typeof google.maps } }).google?.maps
    if (!gm) return

    // Clear old event markers
    eventMarkersRef.current.forEach(m => m.setMap(null))
    eventMarkersRef.current = []

    const allEvents = [
      ...poopEvents.map(e => ({ ...e, emoji: '💩' })),
      ...peeEvents.map(e => ({ ...e, emoji: '💧' })),
    ]

    allEvents.forEach(evt => {
      const marker = new gm.Marker({
        position: { lat: evt.lat, lng: evt.lng },
        map: mapRef.current!,
        label: { text: evt.emoji, fontSize: '16px' },
        icon: { path: gm.SymbolPath.CIRCLE, scale: 0 }, // invisible base, emoji label only
      })
      eventMarkersRef.current.push(marker)
    })
  }, [poopEvents, peeEvents])

  return (
    <div
      ref={mapDivRef}
      className="w-full h-full"
      style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
    />
  )
}

interface WalkerClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  dogPhotoUrl: string | null
  healthNotes: string | null
  ownerFirstName: string
  walkerName: string
  walkerPhone: string | null
  walkerRole: string | null
  ownerPhone: string | null
  careFocus: string | null
  walkerStreak?: number
  walkTimeBucket?: string | null
}

interface ClientConnection {
  token: string
  dogId: string | null
  dogName: string
  dogBreed: string | null
  dogPhoto: string | null
  healthNotes: string | null
  careFocus: string
  walkTimeBucket?: string | null
  ownerFirstName: string
  lastWalkDate: string | null
}

// ── Walker-side "don't forget today's report" reminder ─────────────────────────
// Conservative on purpose: only flags once the dog's usual walk window has
// clearly passed for the day (IST), and only if nothing has been logged for
// this connection since local midnight IST. Better to under-remind than nag.
const WALK_BUCKET_PASSED_HOUR_IST: Record<string, number> = {
  morning: 12,   // walk window is "morning" — flag once it's past noon
  afternoon: 17, // flag once it's past 5pm
  evening: 21,   // flag once it's past 9pm
}

function istNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

function istDateKey(iso: string): string {
  return new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString()
}

function walkWindowHasPassed(bucket: string | null | undefined): boolean {
  if (!bucket) return false
  const passHour = WALK_BUCKET_PASSED_HOUR_IST[bucket]
  if (passHour == null) return false
  return istNow().getHours() >= passHour
}

function hasLoggedToday(logs: { created_at: string }[]): boolean {
  const todayKey = istNow().toDateString()
  return logs.some(l => istDateKey(l.created_at) === todayKey)
}

function relativeTime(iso: string): string {
  const d = new Date(iso), now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

const CARE_FOCUS_CONFIG: Record<string, { emoji: string; label: string; bg: string; border: string; color: string; shadowTint: string; walkerNote: string }> = {
  stomach: { emoji: '💩', label: 'Stomach monitoring', bg: '#FEF9C3', border: '#FDE047', color: '#854D0E', shadowTint: '133,77,14', walkerNote: 'Poop photo is especially important today. Please photograph every time.' },
  recovery: { emoji: '🩹', label: 'Recovery mode', bg: '#FEE2E2', border: '#FECACA', color: '#991B1B', shadowTint: '153,27,27', walkerNote: 'Gentle walk only. No running. Watch for limping or discomfort.' },
  anxiety: { emoji: '😰', label: 'Anxiety watch', bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', shadowTint: '29,78,216', walkerNote: 'Stay calm. Avoid busy roads and loud areas. Short walk is fine.' },
  senior: { emoji: '🐕', label: 'Senior dog', bg: '#F3E8FF', border: '#E9D5FF', color: '#7C3AED', shadowTint: '124,58,237', walkerNote: 'Easy pace. Rest often. Do not push distance today.' },
  puppy: { emoji: '🐶', label: 'Puppy', bg: '#F0FDF4', border: '#86EFAC', color: '#166534', shadowTint: '22,101,52', walkerNote: 'Short walk. Lots of praise. Watch for tiredness.' },
}

interface WalkLog {
  id: string
  duration_mins: number | null
  poop_count: number
  pee_count: number
  mood: string | null
  notes: string | null
  distance_km: number | null
  created_at: string
}

interface GpsPoint {
  lat: number
  lng: number
  ts: string
  accuracy?: number // meters — stored for future route-quality auditing
}

interface WalkEvent {
  type: 'pee' | 'poop'
  lat: number | null
  lng: number | null
  ts: string
  photoUrl?: string | null
}

type WalkPhase = 'idle' | 'walking' | 'logging' | 'success'
type WalkerTab = 'walk' | 'settings'

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'issue', emoji: '😟', label: 'Had a problem' },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const ROLE_OPTIONS = [
  { value: 'dog_walker', label: 'Dog Walker' },
  { value: 'family_friend', label: 'Family Friend' },
  { value: 'professional', label: 'Professional' },
  { value: 'other', label: 'Other' },
]

// ── Walker dashboard translations ──────────────────────────────────────────────
// Covers the highest-frequency strings a walker sees every day: primary action
// buttons, tab labels, pee/poop logging, section headers, GPS help, and the
// send-report confirmation flow. Lower-priority secondary copy (demo/practice
// walk hints, settings sub-sections beyond My Profile/Connected Dog, etc.) is
// intentionally left in English for now to keep this change scoped and low-risk.
export type WalkerLang = 'en' | 'hinglish' | 'hi' | 'mr'

export const WALKER_LANGUAGES: { code: WalkerLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hinglish', label: 'Hinglish' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
]

// One-tap note phrases — inserted into the notes textarea instead of typed.
// Deliberately excludes anything that reads like a health/behavior diagnosis
// ("seemed sick", "limping") — a vague auto-note like that could either
// needlessly alarm a parent or, worse, get trusted over an actual call when
// something's really wrong. Kept to routine/positive + a few honest minor
// observations + weather context.
const QUICK_NOTES: Record<WalkerLang, string[]> = {
  en: [
    'Had a great walk today 🐾',
    'Walked well, no issues',
    'Happy and energetic the whole time',
    'Calm, easy walk today',
    'A little tired today, walked slower than usual',
    'Was a bit hesitant at first, settled in after a few minutes',
    'Stayed close, a little cautious today',
    'Walked a shorter route due to heat',
    'Rained a little, cut the walk a bit short',
  ],
  hinglish: [
    'Aaj bahut achhi walk hui 🐾',
    'Achhe se walk hui, koi problem nahi',
    'Poori walk mein khush aur energetic tha',
    'Aaj shaant aur aasan walk thi',
    'Aaj thoda tired tha, dheere chala',
    'Shuru mein thoda hesitant tha, phir theek ho gaya',
    'Aaj thoda careful raha, paas hi raha',
    'Garmi ki wajah se chhoti route li',
    'Thodi baarish hui, walk jaldi khatam ki',
  ],
  hi: [
    'आज बहुत अच्छी वॉक हुई 🐾',
    'अच्छे से वॉक हुई, कोई दिक्कत नहीं',
    'पूरी वॉक में खुश और एनर्जेटिक था',
    'आज शांत और आसान वॉक थी',
    'आज थोड़ा थका हुआ था, धीरे चला',
    'शुरुआत में थोड़ा हिचकिचाया, फिर ठीक हो गया',
    'आज थोड़ा सतर्क रहा, पास ही रहा',
    'गर्मी की वजह से छोटा रास्ता लिया',
    'थोड़ी बारिश हुई, वॉक जल्दी खत्म की',
  ],
  mr: [
    'आज खूप छान वॉक झाली 🐾',
    'चांगली वॉक झाली, काही अडचण नाही',
    'संपूर्ण वॉकमध्ये आनंदी आणि उत्साही होता',
    'आज शांत आणि सोपी वॉक होती',
    'आज थोडा थकलेला होता, हळू चालला',
    'सुरुवातीला थोडा घाबरला, नंतर ठीक झाला',
    'आज थोडा सावध राहिला, जवळच राहिला',
    'उष्णतेमुळे लहान रस्ता घेतला',
    'थोडा पाऊस पडला, वॉक लवकर संपवली',
  ],
}

interface WalkerTranslations {
  tabWalk: string
  tabSettings: string
  hiGreeting: string
  youreWalking: string
  live: string
  whoWalkingToday: string
  chooseDog: string
  changeDog: string
  startWalk: string
  gpsAutoNote: string
  healthNoteLabel: string
  healthNotesFromOwner: string
  dogHealthNotes: (dog: string) => string
  toiletLabel: string
  pottyLabel: string
  logged: string
  endWalk: string
  endPracticeWalk: string
  gettingGps: string
  takePhotoOf: (dog: string) => string
  tapToTakePhoto: string
  uploadingPhoto: string
  photoUploadFailed: string
  photoStillUploading: string
  notesLabel: string
  howWasDog: (dog: string) => string
  moodGreat: string
  moodOkay: string
  moodIssue: string
  sendToOwner: (dog: string) => string
  sendingReport: string
  walkDoneTitle: (dog: string) => string
  reportSentBody: (dog: string) => string
  alsoEmailed: string
  sendReportButton: (dog: string) => string
  logAnotherWalk: string
  recentWalks: string
  noWalksYet: (dog: string) => string
  reportSentToOwner: (dog: string) => string
  minWalk: (n: number) => string
  walkWord: string
  gpsHelpHeading: string
  gpsHelpBody: (dog: string) => string
  onAndroid: string
  onIphone: string
  tryLocationAgain: string
  androidSteps: string[]
  iphoneSteps: string[]
  myProfile: string
  connectedDog: string
}

const WALKER_T: Record<WalkerLang, WalkerTranslations> = {
  en: {
    tabWalk: 'Walk',
    tabSettings: 'Settings',
    hiGreeting: 'Hi',
    youreWalking: "You're walking",
    live: 'Live',
    whoWalkingToday: 'Who are you walking today? 🐕',
    chooseDog: 'Choose the dog for this walk',
    changeDog: '← Change dog',
    startWalk: '🐾 Start Walk',
    gpsAutoNote: 'GPS tracking starts automatically when you begin',
    healthNoteLabel: 'Health note:',
    healthNotesFromOwner: 'Health notes from owner',
    dogHealthNotes: (dog: string) => `${dog}'s health notes`,
    toiletLabel: 'Toilet 💧',
    pottyLabel: 'Potty + Photo 💩',
    logged: 'Logged!',
    endWalk: 'End Walk',
    endPracticeWalk: 'End Practice Walk ✓',
    gettingGps: 'Getting GPS…',
    takePhotoOf: (dog: string) => `Take a photo of ${dog} 📸`,
    tapToTakePhoto: 'Tap to take a photo',
    uploadingPhoto: 'Uploading…',
    photoUploadFailed: 'Upload failed — tap to try again',
    photoStillUploading: 'Photo is still uploading — wait a moment then try again',
    notesLabel: 'Notes for the owner',
    howWasDog: (dog: string) => `How was ${dog}?`,
    moodGreat: 'Great',
    moodOkay: 'Okay',
    moodIssue: 'Had a problem',
    sendToOwner: (dog: string) => `Send to ${dog}'s owner ✓`,
    sendingReport: 'Sending report…',
    walkDoneTitle: (dog: string) => `${dog}'s walk done!`,
    reportSentBody: (dog: string) => `Report sent to ${dog}'s owner. WhatsApp is opening now.`,
    alsoEmailed: 'PupStep has also emailed the report to the owner.',
    sendReportButton: (dog: string) => `📲 Send report to ${dog}'s owner`,
    logAnotherWalk: '🐕 Log another walk',
    recentWalks: 'Recent Walks',
    noWalksYet: (dog: string) => `No walks logged yet. Tap Start Walk to begin your first walk with ${dog}.`,
    reportSentToOwner: (dog: string) => `✅ Report sent to ${dog}'s owner`,
    minWalk: (n: number) => `${n} min walk`,
    walkWord: 'Walk',
    gpsHelpHeading: 'Location access needed',
    gpsHelpBody: (dog: string) => `Without GPS, ${dog}'s owner cannot see the route ${dog} walked.`,
    onAndroid: 'On Android',
    onIphone: 'On iPhone',
    tryLocationAgain: 'Try location again',
    androidSteps: ['Open Chrome Settings (three dots, top right)', 'Tap "Site settings"', 'Find "Location" and allow'],
    iphoneSteps: ['Go to Settings → Safari', 'Tap "Location"', 'Select "Allow"'],
    myProfile: 'My Profile',
    connectedDog: 'Connected Dog',
  },
  hinglish: {
    tabWalk: 'Walk',
    tabSettings: 'Settings',
    hiGreeting: 'Hi',
    youreWalking: 'Aap walk karwa rahe ho',
    live: 'Live',
    whoWalkingToday: 'Aaj kis kutte ko walk karwana hai? 🐕',
    chooseDog: 'Is walk ke liye kutta choose karein',
    changeDog: '← Kutta badlein',
    startWalk: '🐾 Start Walk',
    gpsAutoNote: 'GPS tracking apne aap shuru ho jaati hai jab aap start karte ho',
    healthNoteLabel: 'Health note:',
    healthNotesFromOwner: 'Owner ke health notes',
    dogHealthNotes: (dog: string) => `${dog} ke health notes`,
    toiletLabel: 'Toilet 💧',
    pottyLabel: 'Potty + Photo 💩',
    logged: 'Log ho gaya!',
    endWalk: 'End Walk',
    endPracticeWalk: 'Practice Walk Khatam Karein ✓',
    gettingGps: 'GPS mil raha hai…',
    takePhotoOf: (dog: string) => `${dog} ki photo lein 📸`,
    tapToTakePhoto: 'Photo lene ke liye tap karein',
    uploadingPhoto: 'Upload ho raha hai…',
    photoUploadFailed: 'Upload fail ho gaya — dobara try karein',
    photoStillUploading: 'Photo abhi upload ho raha hai — thoda ruk kar phir try karein',
    notesLabel: 'Owner ke liye notes',
    howWasDog: (dog: string) => `${dog} kaisa tha?`,
    moodGreat: 'Bahut Achha',
    moodOkay: 'Theek-Thaak',
    moodIssue: 'Problem hui',
    sendToOwner: (dog: string) => `${dog} ke owner ko bhejein ✓`,
    sendingReport: 'Report bheji ja rahi hai…',
    walkDoneTitle: (dog: string) => `${dog} ki walk ho gayi!`,
    reportSentBody: (dog: string) => `${dog} ke owner ko report bhej di gayi. WhatsApp khul raha hai.`,
    alsoEmailed: 'PupStep ne owner ko report email bhi kar di hai.',
    sendReportButton: (dog: string) => `📲 ${dog} ke owner ko report bhejein`,
    logAnotherWalk: '🐕 Ek aur walk log karein',
    recentWalks: 'Recent Walks',
    noWalksYet: (dog: string) => `Abhi tak koi walk log nahi hui. ${dog} ke saath pehli walk shuru karne ke liye Start Walk par tap karein.`,
    reportSentToOwner: (dog: string) => `✅ ${dog} ke owner ko report bhej di gayi`,
    minWalk: (n: number) => `${n} min ki walk`,
    walkWord: 'Walk',
    gpsHelpHeading: 'Location access chahiye',
    gpsHelpBody: (dog: string) => `GPS ke bina, ${dog} ke owner ko ${dog} ka route nahi dikhega.`,
    onAndroid: 'Android par',
    onIphone: 'iPhone par',
    tryLocationAgain: 'Location dobara try karein',
    androidSteps: ['Chrome Settings kholein (upar right mein teen dots)', '"Site settings" par tap karein', '"Location" dhoondein aur allow karein'],
    iphoneSteps: ['Settings → Safari mein jaayein', '"Location" par tap karein', '"Allow" select karein'],
    myProfile: 'Meri Profile',
    connectedDog: 'Connected Dog',
  },
  hi: {
    tabWalk: 'वॉक',
    tabSettings: 'सेटिंग्स',
    hiGreeting: 'नमस्ते',
    youreWalking: 'आप वॉक करवा रहे हैं',
    live: 'लाइव',
    whoWalkingToday: 'आज किस कुत्ते को वॉक करवाना है? 🐕',
    chooseDog: 'इस वॉक के लिए कुत्ता चुनें',
    changeDog: '← कुत्ता बदलें',
    startWalk: '🐾 Start Walk',
    gpsAutoNote: 'शुरू करते ही GPS ट्रैकिंग अपने आप शुरू हो जाती है',
    healthNoteLabel: 'हेल्थ नोट:',
    healthNotesFromOwner: 'मालिक के हेल्थ नोट्स',
    dogHealthNotes: (dog: string) => `${dog} के हेल्थ नोट्स`,
    toiletLabel: 'पेशाब 💧',
    pottyLabel: 'पॉटी + फोटो 💩',
    logged: 'लॉग हो गया!',
    endWalk: 'End Walk',
    endPracticeWalk: 'प्रैक्टिस वॉक समाप्त करें ✓',
    gettingGps: 'GPS मिल रहा है…',
    takePhotoOf: (dog: string) => `${dog} की फोटो लें 📸`,
    tapToTakePhoto: 'फोटो लेने के लिए टैप करें',
    uploadingPhoto: 'अपलोड हो रहा है…',
    photoUploadFailed: 'अपलोड नहीं हुआ — फिर से टैप करें',
    photoStillUploading: 'फोटो अभी अपलोड हो रहा है — थोड़ा रुककर फिर कोशिश करें',
    notesLabel: 'मालिक के लिए नोट्स',
    howWasDog: (dog: string) => `${dog} कैसा था?`,
    moodGreat: 'बहुत अच्छा',
    moodOkay: 'ठीक-ठाक',
    moodIssue: 'समस्या हुई',
    sendToOwner: (dog: string) => `${dog} के मालिक को भेजें ✓`,
    sendingReport: 'रिपोर्ट भेजी जा रही है…',
    walkDoneTitle: (dog: string) => `${dog} की वॉक हो गई!`,
    reportSentBody: (dog: string) => `${dog} के मालिक को रिपोर्ट भेज दी गई है। WhatsApp खुल रहा है।`,
    alsoEmailed: 'PupStep ने मालिक को रिपोर्ट ईमेल भी कर दी है।',
    sendReportButton: (dog: string) => `📲 ${dog} के मालिक को रिपोर्ट भेजें`,
    logAnotherWalk: '🐕 एक और वॉक लॉग करें',
    recentWalks: 'हाल की वॉक्स',
    noWalksYet: (dog: string) => `अभी तक कोई वॉक लॉग नहीं हुई। ${dog} के साथ पहली वॉक शुरू करने के लिए Start Walk पर टैप करें।`,
    reportSentToOwner: (dog: string) => `✅ ${dog} के मालिक को रिपोर्ट भेज दी गई`,
    minWalk: (n: number) => `${n} मिनट की वॉक`,
    walkWord: 'वॉक',
    gpsHelpHeading: 'लोकेशन एक्सेस चाहिए',
    gpsHelpBody: (dog: string) => `GPS के बिना, ${dog} के मालिक को ${dog} का रूट नहीं दिखेगा।`,
    onAndroid: 'Android पर',
    onIphone: 'iPhone पर',
    tryLocationAgain: 'लोकेशन फिर से आज़माएं',
    androidSteps: ['Chrome सेटिंग्स खोलें (ऊपर दाईं ओर तीन डॉट्स)', '"Site settings" पर टैप करें', '"Location" ढूंढें और अनुमति दें'],
    iphoneSteps: ['Settings → Safari में जाएं', '"Location" पर टैप करें', '"Allow" चुनें'],
    myProfile: 'मेरी प्रोफ़ाइल',
    connectedDog: 'जुड़ा हुआ कुत्ता',
  },
  mr: {
    tabWalk: 'वॉक',
    tabSettings: 'सेटिंग्ज',
    hiGreeting: 'नमस्कार',
    youreWalking: 'तुम्ही वॉक करवत आहात',
    live: 'लाइव्ह',
    whoWalkingToday: 'आज कोणत्या कुत्र्याला वॉक करवायचे? 🐕',
    chooseDog: 'या वॉकसाठी कुत्रा निवडा',
    changeDog: '← कुत्रा बदला',
    startWalk: '🐾 Start Walk',
    gpsAutoNote: 'सुरू करताच GPS ट्रॅकिंग आपोआप सुरू होते',
    healthNoteLabel: 'हेल्थ नोट:',
    healthNotesFromOwner: 'मालकाच्या हेल्थ नोट्स',
    dogHealthNotes: (dog: string) => `${dog} च्या हेल्थ नोट्स`,
    toiletLabel: 'लघवी 💧',
    pottyLabel: 'शौच + फोटो 💩',
    logged: 'लॉग झाले!',
    endWalk: 'End Walk',
    endPracticeWalk: 'सराव वॉक संपवा ✓',
    gettingGps: 'GPS मिळत आहे…',
    takePhotoOf: (dog: string) => `${dog} चा फोटो घ्या 📸`,
    tapToTakePhoto: 'फोटो घेण्यासाठी टॅप करा',
    uploadingPhoto: 'अपलोड होत आहे…',
    photoUploadFailed: 'अपलोड झाले नाही — पुन्हा टॅप करा',
    photoStillUploading: 'फोटो अजून अपलोड होत आहे — थोडा वेळ थांबून पुन्हा प्रयत्न करा',
    notesLabel: 'मालकासाठी नोट्स',
    howWasDog: (dog: string) => `${dog} कसा होता?`,
    moodGreat: 'खूप छान',
    moodOkay: 'ठीक-ठाक',
    moodIssue: 'समस्या झाली',
    sendToOwner: (dog: string) => `${dog} च्या मालकाला पाठवा ✓`,
    sendingReport: 'अहवाल पाठवला जात आहे…',
    walkDoneTitle: (dog: string) => `${dog} ची वॉक झाली!`,
    reportSentBody: (dog: string) => `${dog} च्या मालकाला अहवाल पाठवला गेला आहे. WhatsApp उघडत आहे.`,
    alsoEmailed: 'PupStep ने मालकाला अहवाल ईमेलनेही पाठवला आहे.',
    sendReportButton: (dog: string) => `📲 ${dog} च्या मालकाला अहवाल पाठवा`,
    logAnotherWalk: '🐕 आणखी एक वॉक लॉग करा',
    recentWalks: 'अलीकडील वॉक्स',
    noWalksYet: (dog: string) => `अजून कोणतीही वॉक लॉग झाली नाही. ${dog} सोबत पहिली वॉक सुरू करण्यासाठी Start Walk वर टॅप करा.`,
    reportSentToOwner: (dog: string) => `✅ ${dog} च्या मालकाला अहवाल पाठवला गेला`,
    minWalk: (n: number) => `${n} मिनिटांची वॉक`,
    walkWord: 'वॉक',
    gpsHelpHeading: 'लोकेशन अ‍ॅक्सेस हवा',
    gpsHelpBody: (dog: string) => `GPS शिवाय, ${dog} च्या मालकाला ${dog} चा मार्ग दिसणार नाही.`,
    onAndroid: 'Android वर',
    onIphone: 'iPhone वर',
    tryLocationAgain: 'लोकेशन पुन्हा प्रयत्न करा',
    androidSteps: ['Chrome सेटिंग्ज उघडा (वरती उजवीकडे तीन ठिपके)', '"Site settings" वर टॅप करा', '"Location" शोधा आणि परवानगी द्या'],
    iphoneSteps: ['Settings → Safari मध्ये जा', '"Location" वर टॅप करा', '"Allow" निवडा'],
    myProfile: 'माझी प्रोफाइल',
    connectedDog: 'जोडलेला कुत्रा',
  },
}

function moodLabel(t: WalkerTranslations, value: string): string {
  if (value === 'great') return t.moodGreat
  if (value === 'okay') return t.moodOkay
  if (value === 'issue') return t.moodIssue
  return value
}

function WalkerLanguagePicker({ lang, onChange }: { lang: WalkerLang; onChange: (l: WalkerLang) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 w-full"
      style={{ background: 'rgba(10,47,53,0.06)', borderRadius: 999, padding: 3 }}
    >
      {WALKER_LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className="flex-1 py-1.5 rounded-full text-center transition-all active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
          style={{
            background: lang === l.code ? 'oklch(0.48 0.17 196)' : 'transparent',
            color: lang === l.code ? '#ffffff' : '#4B5563',
            fontFamily: 'var(--font-nunito)',
            fontSize: 10.5,
            fontWeight: 700,
            boxShadow: lang === l.code ? CLAY_SHADOW_TEAL_ACCENT : 'none',
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
            whiteSpace: 'nowrap',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

function SettingsTab({
  token,
  walkerName,
  walkerPhone,
  walkerRole,
  dogName,
  dogBreed,
  dogPhotoUrl,
  healthNotes,
  ownerFirstName,
  ownerPhone,
  careFocus,
  showToast,
  addClientOtp,
  setAddClientOtp,
  addClientLoading,
  setAddClientLoading,
  addClientSuccess,
  setAddClientSuccess,
  addClientError,
  setAddClientError,
  t,
}: {
  token: string
  walkerName: string
  walkerPhone: string | null
  walkerRole: string | null
  dogName: string
  dogBreed: string | null
  dogPhotoUrl: string | null
  healthNotes: string | null
  ownerFirstName: string
  ownerPhone: string | null
  careFocus: string | null
  showToast: (msg: string) => void
  addClientOtp: string
  setAddClientOtp: (v: string) => void
  addClientLoading: boolean
  setAddClientLoading: (v: boolean) => void
  addClientSuccess: string | null
  setAddClientSuccess: (v: string | null) => void
  addClientError: string | null
  setAddClientError: (v: string | null) => void
  t: WalkerTranslations
}) {
  const [profileName, setProfileName] = useState(walkerName)
  const [profileRole, setProfileRole] = useState(walkerRole ?? '')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const careFocusKeys = parseCareFocus(careFocus)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the last value we actually intended to persist (or the initial value),
  // so we only schedule a save when the walker changes something — guards against
  // React re-invoking this effect (e.g. Strict Mode's dev double-invoke) with the
  // same unchanged values and firing a spurious network request on mount.
  const lastIntentRef = useRef({ name: walkerName, role: walkerRole ?? '' })

  const dashUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/walker/${token}`
    : `https://pupstep.in/walker/${token}`

  const saveProfile = useCallback(async (name: string, role: string) => {
    if (!name.trim()) return
    setSaving(true)
    setJustSaved(false)
    try {
      const res = await fetch(`/api/walker/${token}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walker_name: name, walker_role: role }),
      })
      if (res.ok) {
        showToast('Profile updated ✓')
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2000)
      } else {
        showToast('Failed to save. Try again.')
      }
    } catch {
      showToast('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }, [token, showToast])

  // Auto-save profile changes (debounced) — no explicit "Save" button needed.
  useEffect(() => {
    if (profileName === lastIntentRef.current.name && profileRole === lastIntentRef.current.role) {
      // Nothing actually changed since the last time we scheduled/applied a save —
      // avoid firing a request (protects against effect re-invocation, e.g. Strict Mode).
      return
    }
    lastIntentRef.current = { name: profileName, role: profileRole }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveProfile(profileName, profileRole)
    }, 800)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [profileName, profileRole, saveProfile])

  function handleCopyLink() {
    navigator.clipboard.writeText(dashUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {
      showToast('Could not copy link')
    })
  }

  const sectionHead = (title: string) => (
    <p style={{
      fontFamily: 'var(--font-fredoka)',
      fontSize: 16,
      fontWeight: 700,
      color: '#0A2F35',
      margin: '0 0 14px',
    }}>{title}</p>
  )

  return (
    <div className="px-5 pt-2 pb-10 space-y-4">

      {/* ── Section 1: My Profile ── */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: CLAY_SHADOW_CREAM }}>
        {sectionHead(t.myProfile)}
        <div className="space-y-3">
          <div>
            <label style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
              Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 pr-20 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                style={{ fontFamily: 'var(--font-nunito)', outlineColor: 'oklch(0.48 0.17 196)' }}
              />
              {(saving || justSaved) && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                  style={{ fontFamily: 'var(--font-nunito)', color: saving ? '#94A3B8' : 'oklch(0.48 0.17 196)' }}
                >
                  {saving ? 'Saving…' : 'Saved ✓'}
                </span>
              )}
            </div>
          </div>
          {walkerPhone && (
            <div>
              <label style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                Phone
              </label>
              <div
                className="w-full rounded-xl border border-slate-100 px-3 py-3 text-sm bg-slate-50"
                style={{ fontFamily: 'var(--font-nunito)', color: '#64748B' }}
              >
                {walkerPhone}
              </div>
            </div>
          )}
          <div>
            <label style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfileRole(opt.value)}
                  className="py-2.5 px-3 rounded-2xl border-2 text-sm font-bold transition-all active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                  style={{
                    fontFamily: 'var(--font-nunito)',
                    borderColor: profileRole === opt.value ? 'oklch(0.48 0.17 196)' : '#E2E8F0',
                    background: profileRole === opt.value ? 'oklch(0.95 0.04 196)' : '#fff',
                    color: profileRole === opt.value ? 'oklch(0.40 0.17 196)' : '#64748B',
                    boxShadow: profileRole === opt.value ? CLAY_SHADOW_TEAL_ACCENT : undefined,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Connected Dog ── */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: CLAY_SHADOW_CREAM }}>
        {sectionHead(t.connectedDog)}
        {/* Dog identity row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden" style={{ background: '#FF8C52' }}>
            {dogPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dogPhotoUrl} alt={dogName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
            )}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
              {dogName}
            </p>
            {dogBreed && (
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0 }}>{dogBreed}</p>
            )}
          </div>
        </div>

        {/* Care focus badges — one per selected care focus */}
        {careFocusKeys.filter(k => k !== 'normal' && CARE_FOCUS_CONFIG[k]).map(k => {
          const cfg = CARE_FOCUS_CONFIG[k]
          return (
            <div key={k} style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 16, padding: '8px 12px', marginBottom: 10, marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: undefined }}>
              <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
            </div>
          )
        })}

        {/* Health notes */}
        {healthNotes && (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 16, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start', boxShadow: CLAY_SHADOW_AMBER }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>{healthNotes}</p>
          </div>
        )}

        {/* Owner label */}
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: '0 0 10px' }}>
          {dogName}&apos;s owner: <strong style={{ color: '#0A2F35' }}>{ownerFirstName}</strong>
        </p>

        {/* WhatsApp owner */}
        {ownerPhone && (
          <a
            href={`https://wa.me/91${ownerPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none', boxShadow: CLAY_SHADOW_WHATSAPP }}
          >
            💬 WhatsApp {dogName}&apos;s owner
          </a>
        )}

        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#94A3B8', marginTop: 10, textAlign: 'center' }}>
          You cannot edit dog details. Ask the owner.
        </p>
      </div>

      {/* ── Section 3: Your Dashboard Link ── */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: CLAY_SHADOW_CREAM }}>
        {sectionHead('Your Dashboard Link')}
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
          Use this same link every time you walk {dogName}. Bookmark it or save to WhatsApp.
        </p>
        <div className="space-y-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`My PupStep dashboard for ${dogName} 🐾\nTap to log walks:\n${dashUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none', boxShadow: CLAY_SHADOW_WHATSAPP }}
          >
            📲 Save link on WhatsApp
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
            style={{
              background: '#fff',
              border: '2px solid oklch(0.48 0.17 196)',
              color: 'oklch(0.48 0.17 196)',
              fontFamily: 'var(--font-fredoka)',
              cursor: 'pointer',
              boxShadow: CLAY_SHADOW_TEAL_OUTLINE,
            }}
          >
            {linkCopied ? 'Copied! ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      {/* ── Section 4: Walk Help ── */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: CLAY_SHADOW_CREAM }}>
        {sectionHead('Walk Help')}
        <div className="space-y-3">
          {[
            { icon: '🏃', boldWord: 'Start Walk', pre: 'Tap ', post: ` when you leave with ${dogName}` },
            { icon: '💧💩', boldWord: 'Toilet', pre: 'Tap ', post: ' or Potty buttons when it happens' },
            { icon: '📸', boldWord: null, pre: `Take a photo of ${dogName} after the walk`, post: '' },
            { icon: '✅', boldWord: 'Send report', pre: 'Tap ', post: ' — owner gets it on WhatsApp' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'oklch(0.48 0.17 196)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-fredoka)',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#0A2F35', margin: 0, lineHeight: 1.5 }}>
                {step.icon} {step.pre}{step.boldWord ? <strong>{step.boldWord}</strong> : null}{step.post}
              </p>
            </div>
          ))}
        </div>
        <a
          href={`/walker-guide?token=${token}`}
          style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'oklch(0.48 0.17 196)', display: 'block', textAlign: 'center', marginTop: 16 }}
        >
          Need GPS help? → View walker guide
        </a>
      </div>

      {/* ── Section 5: Support ── */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: CLAY_SHADOW_CREAM }}>
        {sectionHead('Support')}
        <div className="space-y-2">
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none', boxShadow: CLAY_SHADOW_WHATSAPP }}
          >
            💬 WhatsApp PupStep support
          </a>
          <a
            href={`https://wa.me/919999999999?text=${encodeURIComponent(`Problem with my PupStep dashboard [${token}]: `)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
            style={{
              background: '#fff',
              border: '2px solid #E2E8F0',
              color: '#64748B',
              fontFamily: 'var(--font-fredoka)',
              textDecoration: 'none',
              boxShadow: CLAY_SHADOW_TEAL_OUTLINE,
            }}
          >
            🚨 Report a problem
          </a>
        </div>
      </div>

      {/* ── Section 6: Add another client ── */}
      <div className="rounded-[24px]" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '16px', boxShadow: CLAY_SHADOW_CREAM }}>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#0A2F35', margin: '0 0 4px' }}>
          Add another client
        </p>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
          Ask your new client to show you their 4-digit code
        </p>

        {addClientSuccess ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '12px 14px', boxShadow: CLAY_SHADOW_GREEN_SUCCESS }}>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#166534', margin: 0 }}>
              ✅ {addClientSuccess}
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#166534', margin: '4px 0 0' }}>
              Go back to the Walk tab to see your new client.
            </p>
          </div>
        ) : (
          <>
            <input
              type="number"
              inputMode="numeric"
              maxLength={4}
              placeholder="1 2 3 4"
              value={addClientOtp}
              onChange={e => { setAddClientOtp(e.target.value.slice(0, 4)); setAddClientError(null) }}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid #E5E7EB',
                fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: '0.3em',
                fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            {addClientError && (
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#DC2626', margin: '0 0 8px' }}>
                {addClientError}
              </p>
            )}
            <LoadingButton
              disabled={addClientOtp.length !== 4}
              loading={addClientLoading}
              loadingText="Connecting…"
              onClick={async () => {
                setAddClientLoading(true)
                setAddClientError(null)
                try {
                  const res = await fetch(`/api/walker/${token}/add-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otp: addClientOtp }),
                  })
                  const data = await res.json()
                  if (!res.ok) { setAddClientError(data.error ?? 'Something went wrong'); return }
                  setAddClientSuccess(data.message ?? `Connected to ${data.dogName}!`)
                  setAddClientOtp('')
                  // Refresh connections
                  setTimeout(() => window.location.reload(), 2000)
                } catch { setAddClientError('Network error. Try again.') }
                finally { setAddClientLoading(false) }
              }}
              className="rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
              style={{
                minHeight: 52,
                fontSize: 16,
                background: addClientOtp.length === 4 ? 'oklch(0.48 0.17 196)' : '#E5E7EB',
                color: addClientOtp.length === 4 ? '#fff' : '#9CA3AF',
                boxShadow: addClientOtp.length === 4 ? CLAY_SHADOW_TEAL_ACCENT : undefined,
              }}
            >
              Connect →
            </LoadingButton>
          </>
        )}
      </div>

    </div>
  )
}

export default function WalkerClient({
  token,
  dogName,
  dogBreed,
  dogPhotoUrl,
  healthNotes,
  ownerFirstName,
  walkerName,
  walkerPhone,
  walkerRole,
  ownerPhone,
  careFocus,
  walkerStreak = 0,
  walkTimeBucket = null,
}: WalkerClientProps) {
  const [phase, setPhase] = useState<WalkPhase>('idle')
  // Detected once on mount (SSR has no navigator) — flags the small set of
  // in-app browsers we can reliably identify via UA string. See
  // detectInAppBrowser() above for why WhatsApp can't be caught this way.
  const [inAppBrowserName, setInAppBrowserName] = useState<string | null>(null)
  useEffect(() => { setInAppBrowserName(detectInAppBrowser()) }, [])
  const [logs, setLogs] = useState<WalkLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WalkerTab>('walk')
  const careFocusKeys = parseCareFocus(careFocus)

  // Walker's preferred language — persisted to localStorage so a walker returning
  // to their bookmarked dashboard link doesn't have to re-select it every visit.
  const [lang, setLang] = useState<WalkerLang>('en')
  useEffect(() => {
    const saved = localStorage.getItem('pup-walker-lang') as WalkerLang | null
    if (saved && WALKER_LANGUAGES.some(l => l.code === saved)) setLang(saved)
  }, [])
  useEffect(() => {
    localStorage.setItem('pup-walker-lang', lang)
  }, [lang])
  const t = WALKER_T[lang]

  // Multi-client state
  const [connections, setConnections] = useState<ClientConnection[]>([])
  const [selectedToken, setSelectedToken] = useState<string>(token)
  const [showPicker, setShowPicker] = useState(false)
  const [addClientOtp, setAddClientOtp] = useState('')
  const [addClientLoading, setAddClientLoading] = useState(false)
  const [addClientSuccess, setAddClientSuccess] = useState<string | null>(null)
  const [addClientError, setAddClientError] = useState<string | null>(null)

  // Derived: the currently-selected dog's identity (walker may switch dogs via the picker).
  // Falls back to the URL token's props when no connection is selected yet (single-dog walkers).
  const selectedConn = connections.find(c => c.token === selectedToken)
  const activeDogName = selectedConn?.dogName ?? dogName
  const activeDogPhoto = selectedConn?.dogPhoto ?? dogPhotoUrl
  const activeDogBreed = selectedConn?.dogBreed ?? dogBreed
  const activeHealthNotes = selectedConn?.healthNotes ?? healthNotes
  const activeWalkTimeBucket = selectedConn?.walkTimeBucket ?? walkTimeBucket
  // Show the "don't forget today's report" reminder only once the usual walk
  // window has clearly passed and nothing has been logged today for this dog.
  const showNoShowReminder = walkWindowHasPassed(activeWalkTimeBucket) && !hasLoggedToday(logs)

  // Demo walk state
  const [isDemoWalk, setIsDemoWalk] = useState(false)
  const [showDemoConfirm, setShowDemoConfirm] = useState(false)
  const [showDemoSuccess, setShowDemoSuccess] = useState(false)
  // demoStep: 1=walk+gps, 2=toilet hint, 3=potty hint, 4=walk to 200m, 5=end walk ready
  const [demoStep, setDemoStep] = useState(1)
  const [demoToiletDone, setDemoToiletDone] = useState(false)
  const [demoPottyDone, setDemoPottyDone] = useState(false)
  const [demoNudge, setDemoNudge] = useState<string | null>(null)
  const demoNudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/walker/${token}/connections`)
      .then(r => r.json())
      .then((data: ClientConnection[]) => {
        if (Array.isArray(data) && data.length > 1) {
          setConnections(data)
          setShowPicker(true)  // show picker if multiple dogs
        }
      })
      .catch(() => {})
  }, [token])

  // Walk tracking state
  const [elapsed, setElapsed] = useState(0)
  const [distanceKm, setDistanceKm] = useState(0)
  const [gpsRoute, setGpsRoute] = useState<GpsPoint[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)
  const routePointsRef = useRef<{ lat: number; lng: number }[]>([])
  const walkStartRef = useRef<Date | null>(null)
  // Captured the moment End Walk is tapped — duration must be start→end of
  // the WALK, not start→submit (the form-filling minutes don't count).
  const walkEndRef = useRef<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GpsPoint | null>(null)

  // Screen Wake Lock — keeps the screen on during an active walk. Without
  // this, the phone locks mid-walk, the browser suspends JS, and the timer/
  // GPS freeze — walkers were coming back to a glitched screen and couldn't
  // end the walk or send the report. Same pattern as LiveWalkClient.tsx.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Tracks GPS gaps (30s+ with no fix) so the walker gets a real-time nudge
  // to keep the screen on, and so we get Sentry telemetry on how often this
  // happens in the field — not surfaced anywhere after the walk ends.
  const [lastGapSeconds, setLastGapSeconds] = useState<number | null>(null)
  const [showGapWarning, setShowGapWarning] = useState(false)
  const gapWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reportTrackingGap = useCallback((gapSec: number) => {
    setLastGapSeconds(gapSec)
    setShowGapWarning(true)
    if (gapWarningTimerRef.current) clearTimeout(gapWarningTimerRef.current)
    gapWarningTimerRef.current = setTimeout(() => setShowGapWarning(false), 8000)
    import('@sentry/nextjs').then(({ captureMessage }) =>
      captureMessage('GPS tracking gap during walk', {
        level: 'info',
        tags: { walker_token: token },
        extra: { gapSeconds: Math.round(gapSec), userAgent: navigator.userAgent, hasWakeLock: !!wakeLockRef.current && !wakeLockRef.current.released },
      })
    ).catch(() => {})
  }, [token])

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      // Report this via Sentry too, not just the UI banner further down —
      // this is the single biggest lever on GPS accuracy (distance is
      // silently undercounted during any period tracking drops), so we need
      // real data on which devices/browsers actually lack this API, not
      // just a user-facing "your browser doesn't support this" message.
      import('@sentry/nextjs').then(({ captureMessage }) =>
        captureMessage('wakeLock API unavailable', { level: 'warning', tags: { walker_token: token }, extra: { userAgent: navigator.userAgent } })
      ).catch(() => {})
      return
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch (err) {
      // Not supported / denied — the visibilitychange resync below still
      // keeps the timer honest if the screen does lock, but GPS tracking
      // itself still drops during that time. Report it so we can see how
      // often this actually happens in the field, not just guess.
      import('@sentry/nextjs').then(({ captureException }) =>
        captureException(err, { tags: { walker_token: token, context: 'wakeLock_request_failed' }, extra: { userAgent: navigator.userAgent } })
      ).catch(() => {})
    }
  }, [token])

  // On returning to the tab mid-walk (screen unlocked, app switch, etc.):
  // re-acquire the wake lock (it auto-releases when the page hides) and
  // snap the elapsed timer straight to the true wall-clock value instead of
  // waiting for the next tick.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || phase !== 'walking') return
      if (wakeLockRef.current?.released ?? true) requestWakeLock()
      const start = walkStartRef.current
      if (start) setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)))
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [phase, requestWakeLock])

  // Keep routePointsRef in sync with gpsRoute state (for LiveMap polyline)
  useEffect(() => {
    routePointsRef.current = gpsRoute.map(p => ({ lat: p.lat, lng: p.lng }))
  }, [gpsRoute])

  // Real-time walk events (pee/poop during walk)
  const [walkEvents, setWalkEvents] = useState<WalkEvent[]>([])
  const poopPhotoInputRef = useRef<HTMLInputElement>(null)
  const [poopPhotoUploading, setPoopPhotoUploading] = useState(false)
  const [poopPhotoPrompt, setPoopPhotoPrompt] = useState(false)
  const [pendingPoopEvent, setPendingPoopEvent] = useState<{ lat: number | null; lng: number | null; ts: string } | null>(null)

  // Log form state
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  // Quick-note chips are tracked separately from free-typed `notes` so
  // tapping a chip is a clean toggle (select → appears, deselect → removed)
  // instead of fragile find-and-remove string surgery on a shared textarea.
  // Kept in selection order; rendered as its own bullet list, then combined
  // with any free-typed text at submit time.
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([])
  function toggleQuickNote(phrase: string) {
    setSelectedQuickNotes((prev) =>
      prev.includes(phrase) ? prev.filter((p) => p !== phrase) : [...prev, phrase]
    )
  }
  // Bulleted quick notes first, then any freely-typed text — this is what
  // actually gets submitted, so the parent's report shows real bullet
  // points instead of one run-on sentence.
  const composedNotes = [
    ...selectedQuickNotes.map((p) => `• ${p}`),
    ...(notes.trim() ? [notes.trim()] : []),
  ].join('\n')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [startingWalk, setStartingWalk] = useState(false)
  const [endingWalk, setEndingWalk] = useState(false)
  // Brief tap-lock + "logged" confirmation so a walker who isn't sure the tap
  // registered doesn't fire off multiple duplicate pee/poop events.
  const [peeTapLocked, setPeeTapLocked] = useState(false)
  const [poopTapLocked, setPoopTapLocked] = useState(false)
  const [parentWaLink, setParentWaLink] = useState<string | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPhotoUploadError(false)
    try {
      // Compress before upload — see handlePoopPhotoTaken for why
      const { compressImage } = await import('@/lib/compressImage')
      const compressed = await compressImage(file)
      // Upload via our API, NOT directly to Supabase Storage — the walker
      // page has no auth session, so direct uploads run as `anon` and are
      // rejected by storage RLS (403). This was the root cause of every
      // missing walker photo on live reports.
      const form = new FormData()
      form.append('token', selectedToken)
      form.append('kind', 'walk')
      form.append('file', compressed, 'photo.jpg')
      const res = await fetch('/api/walker/photo', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed')
      setPhotoUrl(json.url)
    } catch {
      // Previously a failed upload just silently reset with no feedback —
      // the walker would tap "take photo", nothing would happen, and the
      // report would go out with no photo and no indication anything failed.
      setPhotoUploadError(true)
    } finally {
      setUploading(false)
      // Reset input so the same file can be retried
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function handlePoopPhotoTaken(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingPoopEvent) return
    setPoopPhotoUploading(true)
    try {
      // Compress before upload — raw camera JPEGs are 5-12MB and took 1min+
      // on mobile data (often failing outright). ~1280px JPEG is 150-400KB.
      const { compressImage } = await import('@/lib/compressImage')
      const compressed = await compressImage(file)
      // Upload via our API — see handlePhotoCapture for why direct storage
      // uploads always failed (anon RLS 403).
      const form = new FormData()
      form.append('token', selectedToken)
      form.append('kind', 'poop')
      form.append('file', compressed, 'photo.jpg')
      const res = await fetch('/api/walker/photo', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed')
      setWalkEvents(prev => [...prev, {
        type: 'poop' as const,
        lat: pendingPoopEvent.lat,
        lng: pendingPoopEvent.lng,
        ts: pendingPoopEvent.ts,
        photoUrl: json.url,
      }])
    } catch {
      // photo failed — still add event, but WITHOUT a photo URL (never point
      // the report at a file that doesn't exist), and tell the walker so a
      // missing photo isn't a silent surprise on the parent's report
      setToast(t.photoUploadFailed)
      setTimeout(() => setToast(null), 3000)
      setWalkEvents(prev => [...prev, {
        type: 'poop' as const,
        lat: pendingPoopEvent.lat,
        lng: pendingPoopEvent.lng,
        ts: pendingPoopEvent.ts,
      }])
    } finally {
      setPoopPhotoUploading(false)
      setPoopPhotoPrompt(false)
      setPendingPoopEvent(null)
      // Reset input so same file can be picked again
      if (poopPhotoInputRef.current) poopPhotoInputRef.current.value = ''
    }
  }

  function handlePoopSkip() {
    if (!pendingPoopEvent) return
    setWalkEvents(prev => [...prev, {
      type: 'poop' as const,
      lat: pendingPoopEvent.lat,
      lng: pendingPoopEvent.lng,
      ts: pendingPoopEvent.ts,
    }])
    setPoopPhotoPrompt(false)
    setPendingPoopEvent(null)
  }

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/walker/${selectedToken}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently ignore
    } finally {
      setLogsLoading(false)
    }
  }, [selectedToken])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function retryGPS() {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: GpsPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: new Date().toISOString(),
        }
        setCurrentPos({ lat: point.lat, lng: point.lng })
        setGpsError(null)
        // Resume watchPosition
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            // Reject only genuine multipath garbage (100m+) — see note in startWalk's
            // watchPosition callback for why 30m was starving gpsRoute in urban Mumbai.
            const accuracy = p.coords.accuracy
            if (accuracy > 100) return

            const pt: GpsPoint = {
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              ts: new Date().toISOString(),
              accuracy,
            }

            setGpsRoute((prev) => {
              const last = prev[prev.length - 1]
              if (last) {
                const delta = haversineKm(last.lat, last.lng, pt.lat, pt.lng)
                const elapsedSec = (new Date(pt.ts).getTime() - new Date(last.ts).getTime()) / 1000
                // Suspension gap (30s+ with no fixes): append without counting
                // the unobserved straight-line distance — same rule as the main
                // watch callback in resumeTracking().
                if (elapsedSec > 30) { reportTrackingGap(elapsedSec); return [...prev, pt] }
                // Reject implausible jumps: a dog walk never exceeds ~15 km/h (4.2 m/s).
                // Allow generous margin (20 m/s ≈ 72 km/h) to avoid rejecting valid fast segments,
                // but still catch GPS teleport artifacts (jumping 200m in 1 second = 200 m/s).
                const impliedSpeed = elapsedSec > 0 ? (delta * 1000) / elapsedSec : 0
                if (impliedSpeed > 20) return prev // discard this point, keep previous route unchanged
                // Debounce GPS jitter: ignore a new fix under 3m from the last one if it
                // arrived within 5 seconds — otherwise a stationary walker generates a
                // jagged "spider web" from GPS noise alone, not real movement.
                if (delta * 1000 < 3 && elapsedSec < 5) return prev
                setDistanceKm((d) => +(d + delta).toFixed(3))
              }
              return [...prev, pt]
            })
            setCurrentPos({ lat: pt.lat, lng: pt.lng })
            lastPointRef.current = pt
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGpsError('Location access denied. Distance won\'t be tracked.')
            }
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        )
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access denied. Distance won\'t be tracked.')
        } else {
          setGpsError('Could not get location. Please try again.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  // Demo step progression — driven by distanceKm and events
  useEffect(() => {
    if (!isDemoWalk || phase !== 'walking') return
    const dm = distanceKm * 1000 // metres

    if (demoStep === 1 && dm >= 50) {
      setDemoStep(2)
      setDemoNudge(null)
    } else if (demoStep === 2 && (demoToiletDone) ) {
      setDemoStep(3)
      setDemoNudge(null)
    } else if (demoStep === 3 && (demoPottyDone)) {
      setDemoStep(4)
      setDemoNudge(null)
    } else if (demoStep === 4 && dm >= 200) {
      setDemoStep(5)
      setDemoNudge(null)
    }
  }, [isDemoWalk, phase, distanceKm, demoStep, demoToiletDone, demoPottyDone])

  // Nudge timer — fire if walker hasn't advanced within 5s
  useEffect(() => {
    if (!isDemoWalk || phase !== 'walking') return
    if (demoNudgeTimer.current) clearTimeout(demoNudgeTimer.current)
    const nudges: Record<number, string[]> = {
      1: ['Take a few steps forward to see your route appear on the map 🗺️', 'Keep moving — walk forward with the phone! 👟'],
      2: ['Tap the 💧 Toilet button above to practice — it\'s safe, this is just a demo!', 'Try tapping Toilet 💧 now. Tap it even if Bruno didn\'t go!'],
      3: ['Now tap 💩 Potty to practice that button too!', 'Tap Potty 💩 to try it — no photo will open in demo mode'],
      4: ['Keep walking! Almost at 200m 🐕', `${Math.round(200 - distanceKm * 1000)}m more — you\'re doing great!`],
      5: ['Tap the red End Walk button below to finish ↓', 'Great job! Tap End Walk to see the report ↓'],
    }
    const msgs = nudges[demoStep] ?? []
    let i = 0
    function scheduleNudge() {
      demoNudgeTimer.current = setTimeout(() => {
        setDemoNudge(msgs[i % msgs.length] ?? null)
        i++
        scheduleNudge()
      }, 5000)
    }
    scheduleNudge()
    return () => { if (demoNudgeTimer.current) clearTimeout(demoNudgeTimer.current) }
  }, [isDemoWalk, phase, demoStep]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Active-walk persistence ──────────────────────────────────────────────
  // iOS Safari (and low-memory Androids) can silently RELOAD a backgrounded
  // tab while the phone is locked mid-walk. Without persistence, the whole
  // walk lived only in React state — the walker unlocked their phone to a
  // fresh idle screen with the walk gone, and could never end it or send
  // the report. Every active walk is checkpointed to localStorage and
  // restored on mount. Demo walks are never persisted.
  const activeWalkKey = `pup-active-walk-${token}`

  useEffect(() => {
    if (isDemoWalk) return
    if (phase !== 'walking' && phase !== 'logging') return
    const start = walkStartRef.current
    if (!start) return
    try {
      localStorage.setItem(activeWalkKey, JSON.stringify({
        v: 1,
        phase,
        startedAt: start.toISOString(),
        endedAt: walkEndRef.current?.toISOString() ?? null,
        selectedToken,
        gpsRoute,
        distanceKm,
        walkEvents,
      }))
    } catch { /* storage full/blocked — checkpointing is best-effort */ }
  }, [phase, gpsRoute, distanceKm, walkEvents, selectedToken, isDemoWalk, activeWalkKey])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(activeWalkKey)
      if (!raw) return
      const saved = JSON.parse(raw) as {
        v?: number; phase?: string; startedAt?: string; endedAt?: string | null; selectedToken?: string
        gpsRoute?: GpsPoint[]; distanceKm?: number; walkEvents?: WalkEvent[]
      }
      if (saved?.v !== 1 || !saved.startedAt) { localStorage.removeItem(activeWalkKey); return }
      const started = new Date(saved.startedAt)
      // A "walk" started over 6 hours ago is an abandoned session, not a
      // live one — drop it rather than resurrecting a zombie walk.
      if (isNaN(started.getTime()) || Date.now() - started.getTime() > 6 * 3600 * 1000) {
        localStorage.removeItem(activeWalkKey)
        return
      }
      walkStartRef.current = started
      if (Array.isArray(saved.gpsRoute) && saved.gpsRoute.length > 0) {
        setGpsRoute(saved.gpsRoute)
        const lastPt = saved.gpsRoute[saved.gpsRoute.length - 1]
        lastPointRef.current = lastPt
        setCurrentPos({ lat: lastPt.lat, lng: lastPt.lng })
      }
      if (typeof saved.distanceKm === 'number') setDistanceKm(saved.distanceKm)
      if (Array.isArray(saved.walkEvents)) setWalkEvents(saved.walkEvents)
      if (saved.selectedToken) setSelectedToken(saved.selectedToken)
      if (saved.phase === 'logging') {
        // Restore the true end-of-walk moment so duration isn't inflated by
        // whatever happened between the reload and the eventual submit.
        const ended = saved.endedAt ? new Date(saved.endedAt) : null
        walkEndRef.current = ended && !isNaN(ended.getTime()) ? ended : new Date()
        setElapsed(Math.max(0, Math.floor(((walkEndRef.current.getTime()) - started.getTime()) / 1000)))
        setPhase('logging')
      } else {
        setElapsed(Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000)))
        setPhase('walking')
        resumeTracking()
      }
    } catch {
      // Corrupted blob — discard rather than crash the walker screen
      try { localStorage.removeItem(activeWalkKey) } catch { /* noop */ }
    }
    // Mount-only: rehydration must run exactly once, before any user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Starts (or restarts) the timer + GPS watch + wake lock WITHOUT resetting
  // walk state — used both by startWalk (fresh walk) and by rehydration
  // after a mid-walk page reload.
  function resumeTracking() {
    // Keep the screen awake for the whole walk — see wakeLockRef above.
    requestWakeLock()

    // Timer — recomputed from the wall-clock start time every tick, NOT an
    // incrementing counter. setInterval pauses whenever the screen locks or
    // the tab is backgrounded, so `prev + 1` silently lost all that time:
    // walkers returned to a frozen timer and a duration that contradicted
    // started_at/ended_at (which were always wall-clock).
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const start = walkStartRef.current
      if (start) setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)))
    }, 1000)

    // GPS
    if (navigator.geolocation) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          // Reject only genuine multipath garbage (100m+). Dense Mumbai neighbourhoods
          // (tall buildings, narrow lanes) routinely give 40-80m accuracy on real Android
          // phones even while moving normally — a stricter cutoff here starves gpsRoute
          // almost entirely, which is why every report used to look the same (empty route).
          const accuracy = pos.coords.accuracy
          if (accuracy > 100) return

          const point: GpsPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: new Date().toISOString(),
            accuracy,
          }

          setGpsRoute((prev) => {
            const last = prev[prev.length - 1]
            if (last) {
              const delta = haversineKm(last.lat, last.lng, point.lat, point.lng)
              const elapsedSec = (new Date(point.ts).getTime() - new Date(last.ts).getTime()) / 1000
              // No fixes for 30s+ means the tab was suspended (screen lock,
              // app switch) — keep the route continuous by appending the
              // point, but do NOT count the straight-line "chord" as walked
              // distance: that movement was never observed, and counting it
              // would silently mis-measure the walk.
              if (elapsedSec > 30) { reportTrackingGap(elapsedSec); return [...prev, point] }
              // Reject implausible jumps: a dog walk never exceeds ~15 km/h (4.2 m/s).
              // Allow generous margin (20 m/s ≈ 72 km/h) to avoid rejecting valid fast segments,
              // but still catch GPS teleport artifacts (jumping 200m in 1 second = 200 m/s).
              const impliedSpeed = elapsedSec > 0 ? (delta * 1000) / elapsedSec : 0
              if (impliedSpeed > 20) return prev // discard this point, keep previous route unchanged
              // Debounce GPS jitter: ignore a new fix under 3m from the last one if it
              // arrived within 5 seconds — a stationary walker otherwise generates a
              // jagged "spider web" from GPS noise alone, not real movement.
              if (delta * 1000 < 3 && elapsedSec < 5) return prev
              setDistanceKm((d) => +(d + delta).toFixed(3))
            }
            return [...prev, point]
          })
          setCurrentPos({ lat: point.lat, lng: point.lng })
          lastPointRef.current = point
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location access denied. Distance won\'t be tracked.')
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      )
    } else {
      setGpsError('GPS not available on this device.')
    }
  }

  function startWalk() {
    setGpsRoute([])
    setDistanceKm(0)
    setElapsed(0)
    setGpsError(null)
    setCurrentPos(null)
    setWalkEvents([])
    setDemoStep(1)
    setDemoToiletDone(false)
    setDemoPottyDone(false)
    setDemoNudge(null)
    setPhase('walking')
    walkStartRef.current = new Date()
    walkEndRef.current = null

    // Notify parent via server-side email (fire-and-forget — never blocks the walker)
    if (!isDemoWalk) {
      fetch('/api/walks/notify-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_token: selectedToken }),
      }).catch(() => {})
    }

    resumeTracking()
  }

  function endWalk() {
    // Demo mode: gate on 200m
    if (isDemoWalk && distanceKm * 1000 < 200) {
      const remaining = Math.round(200 - distanceKm * 1000)
      setDemoNudge(`Walk ${remaining}m more before ending the practice walk`)
      return
    }
    if (demoNudgeTimer.current) clearTimeout(demoNudgeTimer.current)
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Stop GPS
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    // Screen can sleep again — the walk itself is over
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    walkEndRef.current = new Date()
    setPhase('logging')
    // Camera is optional — walker taps the photo button themselves
  }

  function handlePeeTap() {
    const loc = lastPointRef.current
    setWalkEvents(prev => [...prev, {
      type: 'pee',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
    }])
    // Advance demo step
    if (isDemoWalk && demoStep === 2) {
      setDemoToiletDone(true)
      setDemoNudge('Great! 💧 Toilet logged. Now try 💩 Potty →')
    }
  }

  function handlePoopTap() {
    const loc = lastPointRef.current
    // In demo mode skip the prompt and add event directly
    if (isDemoWalk) {
      setWalkEvents(prev => [...prev, {
        type: 'poop',
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        ts: new Date().toISOString(),
        photoUrl: null,
      }])
      if (demoStep === 3) {
        setDemoPottyDone(true)
        setDemoNudge('Great! 💩 Potty logged. Now keep walking to 200m →')
      }
      return
    }
    // Real walk — store pending event and show photo prompt sheet
    setPendingPoopEvent({
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
    })
    setPoopPhotoPrompt(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Photo upload is async (compress + storage upload) and was racing the
    // submit button — a walker who tapped the camera then immediately hit
    // "Send to owner" would submit before photoUrl state ever got set,
    // silently dropping a photo that looked like it captured fine. The
    // button below is disabled while uploading, but a native Enter-key form
    // submit can bypass a disabled button, so this guard is the real fix.
    if (uploading) {
      setToast(t.photoStillUploading)
      setTimeout(() => setToast(null), 3000)
      return
    }

    // Demo walk — skip API, go straight to demo success screen
    if (isDemoWalk) {
      setMood('')
      setNotes('')
      setPhotoUrl(null)
      setElapsed(0)
      setDistanceKm(0)
      setGpsRoute([])
      setWalkEvents([])
      setPhase('idle')
      setShowDemoSuccess(true)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    // Belt-and-suspenders: derive duration from wall-clock start→end (the
    // moment End Walk was tapped, NOT submit time — form-filling minutes
    // don't count as walk time), so it always agrees with started_at even
    // if the tab was suspended mid-walk and the ticking counter froze.
    const walkEndTime = walkEndRef.current ?? new Date()
    const wallClockSecs = walkStartRef.current
      ? Math.floor((walkEndTime.getTime() - walkStartRef.current.getTime()) / 1000)
      : 0
    const durationMins = Math.max(1, Math.round((wallClockSecs > 0 ? wallClockSecs : elapsed) / 60))

    const finalPoopCount = walkEvents.filter(e => e.type === 'poop').length
    const finalPeeCount = walkEvents.filter(e => e.type === 'pee').length

    try {
      const res = await fetch('/api/walk-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_token: selectedToken,
          duration_mins: durationMins,
          distance_km: distanceKm > 0 ? +distanceKm.toFixed(2) : null,
          gps_route: gpsRoute.length > 0 ? gpsRoute : null,
          photo_url: photoUrl ?? null,
          poop_count: finalPoopCount,
          pee_count: finalPeeCount,
          mood: mood || null,
          notes: composedNotes || null,
          started_at: walkStartRef.current?.toISOString() ?? null,
          ended_at: walkEndTime.toISOString(),
          walk_events: walkEvents,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to submit. Please try again.')
        setSubmitting(false)
        return
      }

      // Reset walk state, go to success screen
      if (data.wa_link) setParentWaLink(data.wa_link)
      // Always use relative path so it opens on current domain (not old Vercel URL)
      if (data.report_token) {
        setReportUrl(`/walk-report/${data.report_token}`)
      } else if (data.report_url) {
        // Fallback: strip domain from URL and use relative path
        try {
          const url = new URL(data.report_url)
          setReportUrl(url.pathname)
        } catch {
          setReportUrl(data.report_url)
        }
      }
      setMood('')
      setNotes('')
      setPhotoUrl(null)
      setElapsed(0)
      setDistanceKm(0)
      setGpsRoute([])
      setWalkEvents([])
      walkStartRef.current = null
      walkEndRef.current = null
      // Walk submitted — drop the crash-recovery checkpoint
      try { localStorage.removeItem(activeWalkKey) } catch { /* noop */ }
      setPhase('success')
      fetchLogs()
      // Auto-open WhatsApp to owner with report link — walker just taps Send
      if (data.wa_link) {
        setTimeout(() => window.open(data.wa_link, '_blank', 'noopener'), 700)
      }
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  // Derived counts for during-walk display
  const livePeeCount = walkEvents.filter(ev => ev.type === 'pee').length
  const livePoopCount = walkEvents.filter(ev => ev.type === 'poop').length

  // Poop photos from walk events
  const poopPhotos = walkEvents.filter(ev => ev.type === 'poop' && ev.photoUrl)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fff', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#0A2F35] text-white rounded-[24px] px-5 py-4 text-sm font-semibold text-center animate-bounce-once"
          style={{ fontFamily: 'var(--font-nunito)', boxShadow: CLAY_SHADOW_TEAL }}>
          {toast}
        </div>
      )}

      {/* ─── FEATURE 1: GPS Permission Recovery Screen ─── */}
      {phase === 'walking' && gpsError !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px 40px',
          overflowY: 'auto',
        }}>
          {/* Header — keep logo/greeting visible on this full-screen state too */}
          <div className="flex items-center justify-between" style={{ paddingTop: 32, paddingBottom: 4 }}>
            <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
              PupStep 🐾
            </span>
            <span className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
              {t.hiGreeting}, {walkerName}
            </span>
          </div>
          <div style={{ paddingBottom: 8 }}>
            <WalkerLanguagePicker lang={lang} onChange={setLang} />
          </div>

          {/* Back button */}
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            <button
              onClick={() => { setPhase('idle'); setGpsError(null) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 active:opacity-60 active:scale-[0.97] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
              style={{ fontFamily: 'var(--font-nunito)', boxShadow: CLAY_SHADOW_CREAM }}
            >
              ← Back
            </button>
          </div>

          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 20 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'oklch(0.48 0.17 196)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}>
              📍
            </div>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'var(--font-fredoka)',
            fontSize: 24,
            fontWeight: 700,
            color: '#0A2F35',
            textAlign: 'center',
            margin: '0 0 10px',
          }}>
            {t.gpsHelpHeading}
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: 'var(--font-nunito)',
            fontSize: 14,
            color: '#64748B',
            textAlign: 'center',
            margin: '0 0 28px',
            lineHeight: 1.6,
          }}>
            {t.gpsHelpBody(dogName)}
          </p>

          {/* Android steps */}
          <div style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 24,
            padding: '16px 16px',
            marginBottom: 14,
            boxShadow: CLAY_SHADOW_CREAM,
          }}>
            <p style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 13,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px',
            }}>
              {t.onAndroid}
            </p>
            {t.androidSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'oklch(0.48 0.17 196)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#0A2F35', margin: 0, lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* iPhone steps */}
          <div style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 24,
            padding: '16px 16px',
            marginBottom: 28,
            boxShadow: CLAY_SHADOW_CREAM,
          }}>
            <p style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 13,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px',
            }}>
              {t.onIphone}
            </p>
            {t.iphoneSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'oklch(0.48 0.17 196)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#0A2F35', margin: 0, lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Try again button */}
          <button
            onClick={retryGPS}
            className="w-full active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
            style={{
              background: 'oklch(0.48 0.17 196)',
              borderRadius: 20,
              minHeight: 56,
              border: 'none',
              fontFamily: 'var(--font-fredoka)',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              boxShadow: CLAY_SHADOW_TEAL_ACCENT,
            }}
          >
            {t.tryLocationAgain}
          </button>
        </div>
      )}

      {/* ─── FEATURE 3: Demo Confirm Bottom Sheet ─── */}
      {showDemoConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowDemoConfirm(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '12px 20px 40px',
              width: '100%',
              animation: 'slideUp 200ms ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 100, background: '#CBD5E1' }} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 20,
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 10px',
            }}>
              Practice walk
            </h2>
            <p style={{
              fontFamily: 'var(--font-nunito)',
              fontSize: 14,
              color: '#64748B',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}>
              This is a practice run. No report will be sent to anyone. You&apos;ll see exactly how the real walk works.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  setShowDemoConfirm(false)
                  setIsDemoWalk(true)
                  startWalk()
                }}
                className="w-full active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                style={{
                  background: '#FF8C52',
                  borderRadius: 20,
                  minHeight: 56,
                  border: 'none',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: CLAY_SHADOW_ORANGE,
                }}
              >
                Start practice walk
              </button>
              <button
                onClick={() => {
                  setShowDemoConfirm(false)
                  setIsDemoWalk(false)
                  startWalk()
                }}
                className="w-full active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  minHeight: 44,
                  border: '2px solid oklch(0.48 0.17 196)',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'oklch(0.48 0.17 196)',
                  cursor: 'pointer',
                  boxShadow: CLAY_SHADOW_TEAL_OUTLINE,
                }}
              >
                Skip — start real walk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FEATURE 3: Demo Success Screen ─── */}
      {showDemoSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}>
          {/* Header — keep logo/greeting visible on this full-screen state too */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '32px 20px 8px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
                PupStep 🐾
              </span>
              <span className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
                {t.hiGreeting}, {walkerName}
              </span>
            </div>
            <WalkerLanguagePicker lang={lang} onChange={setLang} />
          </div>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            marginBottom: 20,
          }}>
            ✅
          </div>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 28, fontWeight: 700, color: '#0A2F35', textAlign: 'center', margin: '0 0 10px' }}>
            Practice complete! 🎉
          </h2>
          {/* What they accomplished */}
          <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 16, padding: '12px 16px', marginBottom: 24, width: '100%', maxWidth: 360, boxShadow: CLAY_SHADOW_GREEN_SUCCESS }}>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 8px' }}>You practised:</p>
            {[
              { done: true, label: `Walked ${Math.round(distanceKm * 1000)}m with GPS tracking` },
              { done: demoToiletDone, label: 'Tapped Toilet 💧 button' },
              { done: demoPottyDone, label: 'Tapped Potty 💩 button' },
              { done: true, label: 'Took a dog photo 📸' },
              { done: true, label: 'Generated the report' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{item.done ? '✅' : '⬜'}</span>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: item.done ? '#166534' : '#94A3B8', margin: 0 }}>{item.label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#64748B', textAlign: 'center', margin: '0 0 28px', lineHeight: 1.6 }}>
            Now you know exactly what to do on the real walk with {dogName}.
          </p>
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => {
                setShowDemoSuccess(false)
                setIsDemoWalk(false)
                setPhase('idle')
              }}
              className="w-full active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
              style={{
                background: '#FF8C52',
                borderRadius: 20,
                minHeight: 56,
                border: 'none',
                fontFamily: 'var(--font-fredoka)',
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: CLAY_SHADOW_ORANGE,
              }}
            >
              Start real walk now
            </button>
            <button
              onClick={() => {
                setShowDemoSuccess(false)
                setIsDemoWalk(true)
                startWalk()
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-nunito)',
                fontSize: 13,
                color: 'oklch(0.48 0.17 196)',
                textDecoration: 'underline',
                padding: '8px 16px',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              Watch again
            </button>
          </div>
        </div>
      )}

      {/* Hidden poop photo input (used during walk) */}
      <input
        ref={poopPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePoopPhotoTaken}
      />

      {/* Poop photo prompt bottom sheet */}
      {poopPhotoPrompt && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)', boxShadow: '0 -8px 32px rgba(10,47,53,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px', textAlign: 'center' }}>
              💩 Poop marked!
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#6B7280', margin: '0 0 20px', textAlign: 'center' }}>
              Add a photo? The owner can see it in the report.
            </p>
            <LoadingButton
              loading={poopPhotoUploading}
              loadingText="Uploading photo…"
              onClick={() => poopPhotoInputRef.current?.click()}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
              style={{ padding: '14px', borderRadius: 20, background: '#FF8C52', fontSize: 16, marginBottom: 10, boxShadow: CLAY_SHADOW_ORANGE_SM }}
            >
              📷 Take photo
            </LoadingButton>
            <button
              onClick={handlePoopSkip}
              disabled={poopPhotoUploading}
              className="disabled:opacity-60 active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
              style={{ width: '100%', padding: '14px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 700, border: 'none', cursor: poopPhotoUploading ? 'not-allowed' : 'pointer', boxShadow: CLAY_SHADOW_NEUTRAL }}>
              Skip
            </button>
          </div>
        </>
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-2 flex items-center justify-between">
        <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
          PupStep 🐾
        </span>
        <span className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
          {t.hiGreeting}, {walkerName}
        </span>
      </div>

      {/* Language selector — segmented pill, 4 options, each labelled in its own script */}
      <div className="px-5 pb-4">
        <WalkerLanguagePicker lang={lang} onChange={setLang} />
      </div>

      {/* Tab content */}
      {activeTab === 'walk' && (
        <>
          {/* Dog card */}
          <div className="mx-5 mb-5 rounded-[24px] px-4 py-4 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: CLAY_SHADOW_CREAM }}>
            <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: '#FF8C52' }}>
              {activeDogPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeDogPhoto} alt={activeDogName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">{t.youreWalking}</p>
              <p className="font-bold text-[#0A2F35] text-xl leading-tight" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {activeDogName}
              </p>
              {activeDogBreed && <p className="text-xs text-slate-400">{activeDogBreed}</p>}
            </div>
            {phase === 'walking' && (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1" style={{ boxShadow: CLAY_SHADOW_GREEN_SUCCESS }}>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-700">{t.live}</span>
              </div>
            )}
          </div>

          {/* Health note */}
          {activeHealthNotes && (
            <div className="mx-5 mb-4 rounded-[20px] bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5" style={{ boxShadow: CLAY_SHADOW_AMBER }}>
              <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-amber-800 font-medium"><strong>{t.healthNoteLabel}</strong> {activeHealthNotes}</p>
            </div>
          )}

          {/* Don't-forget-today's-report nudge — only shown once the dog's usual
              walk window has clearly passed and nothing's been logged yet today. */}
          {showNoShowReminder && (
            <div className="mx-5 mb-4 rounded-[20px] bg-orange-50 border border-orange-200 px-4 py-3 flex items-start gap-2.5" style={{ boxShadow: CLAY_SHADOW_ORANGE_BANNER }}>
              <span className="text-base flex-shrink-0 mt-0.5">🕐</span>
              <p className="text-sm font-medium" style={{ color: '#9A3412' }}>
                Don&apos;t forget today&apos;s walk report for {activeDogName}!
              </p>
            </div>
          )}

          {/* ─── IDLE PHASE ─── */}
          {phase === 'idle' && showPicker && (
            <div className="px-5 pt-6 pb-24">
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 24, fontWeight: 700, color: '#0A2F35', marginBottom: 6 }}>
                {t.whoWalkingToday}
              </p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', marginBottom: 24 }}>
                {t.chooseDog}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {connections.map(c => (
                  <button
                    key={c.token}
                    onClick={() => {
                      setSelectedToken(c.token)
                      setShowPicker(false)
                    }}
                    className="active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                    style={{
                      background: '#fff', borderRadius: 24, padding: '16px',
                      border: `2px solid ${selectedToken === c.token ? 'oklch(0.48 0.17 196)' : '#E5E7EB'}`,
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer',
                      boxShadow: CLAY_SHADOW_CREAM,
                    }}
                  >
                    {/* Dog photo */}
                    <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: 'oklch(0.94 0.06 196)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {c.dogPhoto
                        ? <img src={c.dogPhoto} alt={c.dogName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 24 }}>🐕</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
                        {c.dogName}
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                        {c.ownerFirstName}&apos;s dog
                        {c.lastWalkDate ? ` · Last walked ${relativeTime(c.lastWalkDate)}` : ' · Never walked'}
                      </p>
                    </div>
                    <span style={{ fontSize: 20, color: 'oklch(0.48 0.17 196)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'idle' && !showPicker && (
            <div className="px-5 space-y-4">
              {/* Change dog button — shown when walker has multiple clients */}
              {connections.length > 1 && (
                <button
                  onClick={() => setShowPicker(true)}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 13,
                    color: 'oklch(0.48 0.17 196)', fontWeight: 600, cursor: 'pointer', padding: '8px 0', minHeight: 44 }}>
                  {t.changeDog}
                </button>
              )}

              {/* Walker's own logging streak — a warm nod to their own consistency,
                  not a scorecard. Only shown once they've actually built a streak. */}
              {walkerStreak >= 2 && (
                <div
                  className="rounded-[20px] px-4 py-3 flex items-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE8CC 100%)', border: '1.5px solid #FFD8A8', boxShadow: CLAY_SHADOW_ORANGE_BANNER }}
                >
                  <span className="text-3xl leading-none">🔥</span>
                  <div>
                    <p className="font-bold text-[#0A2F35] text-base leading-tight" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      {walkerStreak} day streak!
                    </p>
                    <p className="text-xs text-[#B45309] leading-snug" style={{ fontFamily: 'var(--font-nunito)' }}>
                      You&apos;ve logged a walk every day — keep it going 🐾
                    </p>
                  </div>
                </div>
              )}

              {healthNotes && (
                <div style={{
                  background: '#FFF7ED',
                  border: '1.5px solid #FED7AA',
                  borderRadius: 18,
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  boxShadow: CLAY_SHADOW_AMBER,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#92400E', margin: '0 0 3px' }}>
                      {t.healthNotesFromOwner}
                    </p>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#B45309', margin: 0, lineHeight: 1.5 }}>
                      {healthNotes}
                    </p>
                  </div>
                </div>
              )}
              {careFocusKeys.filter(k => k !== 'normal' && CARE_FOCUS_CONFIG[k]).map(k => {
                const cfg = CARE_FOCUS_CONFIG[k]
                return (
                  <div key={k} style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 16, padding: '12px 14px', marginBottom: 8, boxShadow: undefined }}>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: cfg.color, margin: '0 0 4px' }}>
                      {cfg.emoji} {cfg.label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: cfg.color, margin: 0, lineHeight: 1.5 }}>
                      {cfg.walkerNote}
                    </p>
                  </div>
                )
              })}
              {/* In-app-browser warning — GPS tracking is far less reliable inside
                  a WebView (Facebook/Instagram detectable via UA; WhatsApp is not,
                  so this fires only for what's detectable, and the "keep this
                  screen open" banner during the walk covers the rest). */}
              {inAppBrowserName && (
                <div className="rounded-2xl px-3 py-2 flex items-center gap-2"
                  style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', boxShadow: CLAY_SHADOW_AMBER }}>
                  <span className="text-base flex-shrink-0">⚠️</span>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#92400E', margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                    You&apos;re in {inAppBrowserName}&apos;s in-app browser — GPS tracking works best in Chrome or Safari. Tap the ⋯ menu and choose &quot;Open in browser&quot; for an accurate walk report.
                  </p>
                </div>
              )}
              <LoadingButton
                loading={startingWalk}
                loadingText="Starting walk…"
                onClick={() => {
                  if (startingWalk) return
                  setStartingWalk(true)
                  setIsDemoWalk(false)
                  startWalk()
                }}
                className="rounded-[24px] text-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                style={{ minHeight: 68, background: 'linear-gradient(135deg, #FF8C52 0%, #F07030 100%)', fontSize: 22, boxShadow: CLAY_SHADOW_ORANGE }}
              >
                {t.startWalk}
              </LoadingButton>
              <div className="flex flex-col items-center gap-1">
                <p className="text-center text-xs text-slate-400">{t.gpsAutoNote}</p>
                <button
                  onClick={() => setShowDemoConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-nunito)',
                    fontSize: 13,
                    color: 'oklch(0.48 0.17 196)',
                    textDecoration: 'underline',
                    marginTop: 8,
                    padding: '8px 16px',
                    minHeight: 44,
                    cursor: 'pointer',
                  }}
                >
                  Try a practice walk first
                </button>
              </div>

              {/* First-time guide card — only shown before any walks are logged */}
              {logs.length === 0 && !logsLoading && (
                <div
                  className="rounded-[24px] px-5 py-5 mt-2"
                  style={{ background: '#FFF3E0', boxShadow: CLAY_SHADOW_ORANGE_BANNER }}
                >
                  <p
                    className="font-bold text-[#0A2F35] text-base mb-4"
                    style={{ fontFamily: 'var(--font-fredoka)' }}
                  >
                    How to log a walk 👇
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">🟠</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Tap Start Walk
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        When you leave home
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📍</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Walk as normal
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        GPS tracks your route automatically
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">✅</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Tap End Walk
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Fill in a quick 60-sec report
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-amber-600 font-semibold mt-4"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    The owner gets a report on WhatsApp automatically
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── WALKING PHASE ─── */}
          {phase === 'walking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING}
              className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
              {/* ── Live map — top 46vh ── */}
              <div className="relative w-full flex-shrink-0" style={{ height: '46vh' }}>
                {/* Derive map event arrays from walkEvents */}
                {(() => {
                  const poopEventsForMap = walkEvents.filter(e => e.type === 'poop' && e.lat != null && e.lng != null) as { lat: number; lng: number; ts: string }[]
                  const peeEventsForMap = walkEvents.filter(e => e.type === 'pee' && e.lat != null && e.lng != null) as { lat: number; lng: number; ts: string }[]
                  return (
                    <LiveMap
                      currentPos={currentPos}
                      routePointsRef={routePointsRef}
                      poopEvents={poopEventsForMap}
                      peeEvents={peeEventsForMap}
                    />
                  )
                })()}

                {/* Back button — floating top-left */}
                <button
                  onClick={() => setPhase('idle')}
                  className="absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 active:opacity-60 active:scale-[0.97] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                  style={{ fontFamily: 'var(--font-nunito)', boxShadow: CLAY_SHADOW_CREAM }}
                >
                  ← Back
                </button>

                {/* Poop/pee live counts — floating top-right */}
                <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white bg-opacity-90 rounded-full px-3 py-1.5 border border-gray-200" style={{ boxShadow: CLAY_SHADOW_CREAM }}>
                  <span className="text-sm font-bold text-gray-700">💩 {livePoopCount}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm font-bold text-gray-700">💧 {livePeeCount}</span>
                </div>

                {/* Timer + distance HUD — floating bottom of map */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between px-4 py-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <LivePulseDot color="#ef4444" />
                      <p className="text-3xl font-bold text-white tabular-nums tracking-tight leading-none"
                        style={{ fontFamily: 'var(--font-fredoka)' }}>
                        {formatElapsed(elapsed)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white/80 mt-0.5">{distanceKm.toFixed(2)} km</p>
                  </div>
                </div>

                {/* GPS error overlay */}
                {gpsError && (
                  <div className="absolute top-14 left-4 right-4 z-10 px-3 py-2 rounded-2xl text-xs text-amber-800 text-center"
                    style={{ background: '#FFFBEB', border: '1px solid #FED7AA', boxShadow: CLAY_SHADOW_AMBER }}>
                    ⚠️ {gpsError}
                  </div>
                )}

                {/* Tracking-gap warning — tells the walker in real time when
                    GPS was lost (screen locked, app switched away), instead
                    of them only finding out afterward as a mysteriously low
                    distance on the finished report. Auto-hides after 8s. */}
                {showGapWarning && lastGapSeconds != null && (
                  <div className="absolute top-14 left-4 right-4 z-10 px-3 py-2 rounded-2xl text-xs text-red-800 text-center"
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    ⚠️ Tracking paused for {Math.round(lastGapSeconds)}s — keep this screen on for an accurate route
                  </div>
                )}

                {/* Getting GPS spinner */}
                {!currentPos && !gpsError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-sm">{t.gettingGps}</p>
                    </div>
                  </div>
                )}

                {/* PRACTICE banner */}
                {isDemoWalk && (
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: '#FF8C52', borderRadius: 100, padding: '4px 14px', boxShadow: CLAY_SHADOW_ORANGE_SM }}>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>PRACTICE</p>
                  </div>
                )}
              </div>

              {/* ── Controls — bottom section ── */}
              {/* The bottom tab bar is hidden during an active walk (see the
                  BOTTOM NAV block below), so this only needs to clear the
                  device's own safe area now, not a fixed 64px bar on top of it. */}
              <div className="flex-1 flex flex-col px-5 pt-4 gap-3" style={{ background: '#fff', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
                {/* Older browsers (iOS Safari < 16.4) have no Wake Lock API —
                    ask the walker to keep the screen on manually there. The
                    walk still survives a lock (localStorage checkpoint), but
                    GPS points during the lock are lost. */}
                {typeof window !== 'undefined' && !('wakeLock' in navigator) && (
                  <div style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '10px 14px' }}>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: '#92400E', margin: 0 }}>
                      🔆 {lang === 'hi' ? 'वॉक के दौरान स्क्रीन चालू रखें' : lang === 'mr' ? 'वॉक दरम्यान स्क्रीन चालू ठेवा' : 'Keep your screen on during the walk'}
                    </p>
                  </div>
                )}
                {/* Care Focus banners — walking phase, one per selected care focus */}
                {careFocusKeys.filter(k => k !== 'normal' && CARE_FOCUS_CONFIG[k]).map(k => {
                  const cfg = CARE_FOCUS_CONFIG[k]
                  return (
                    <div key={k} style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 16, padding: '12px 14px', marginBottom: 8, boxShadow: undefined }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: cfg.color, margin: '0 0 4px' }}>
                        {cfg.emoji} {cfg.label}
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: cfg.color, margin: 0, lineHeight: 1.5 }}>
                        {cfg.walkerNote}
                      </p>
                    </div>
                  )
                })}

                {/* FEATURE 2: Health notes pinned during walk */}
                {healthNotes && (
                  <div style={{
                    background: '#fff',
                    border: '2px solid #FCD34D',
                    borderRadius: 18,
                    padding: '10px 14px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    boxShadow: CLAY_SHADOW_AMBER,
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
                        {t.dogHealthNotes(dogName)}
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                        {healthNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── DEMO guided hint system ── */}
                {isDemoWalk && (() => {
                  const dm = Math.round(distanceKm * 1000)
                  const remaining = Math.max(0, 200 - dm)
                  // Step hint card
                  const stepHints: Record<number, { icon: string; text: string; color: string; border: string }> = {
                    1: { icon: '🗺️', text: `Walk forward to see your route on the map`, color: '#0A2F35', border: 'oklch(0.88 0.06 196)' },
                    2: { icon: '💧', text: `If Bruno does susu (toilet), tap the Toilet button now`, color: '#1D4ED8', border: '#BFDBFE' },
                    3: { icon: '💩', text: `If Bruno does potty, tap the Potty button now`, color: '#92400E', border: '#FDE047' },
                    4: { icon: '🐕', text: `Keep walking — ${remaining}m more to finish the practice`, color: '#0A2F35', border: 'oklch(0.88 0.06 196)' },
                    5: { icon: '✅', text: `Great walk! Now tap End Walk to finish the practice`, color: '#166534', border: '#86EFAC' },
                  }
                  const hint = stepHints[demoStep]
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Step indicator dots */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {[1,2,3,4,5].map(s => (
                          <div key={s} style={{
                            width: s < demoStep ? 20 : s === demoStep ? 28 : 8,
                            height: 8, borderRadius: 100,
                            background: s < demoStep ? 'oklch(0.48 0.17 196)' : s === demoStep ? '#FF8C52' : '#E2E8F0',
                            transition: 'all 0.3s ease',
                          }} />
                        ))}
                      </div>
                      {/* Active hint */}
                      <div style={{ background: '#fff', border: `2px solid ${hint.border}`, borderRadius: 18, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: CLAY_SHADOW_CREAM }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{hint.icon}</span>
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: hint.color, margin: 0, lineHeight: 1.4 }}>
                          {demoNudge ?? hint.text}
                        </p>
                      </div>
                      {/* Progress bar for steps 1 + 4 */}
                      {(demoStep === 1 || demoStep === 4) && (
                        <div style={{ background: '#F1F5F9', borderRadius: 100, height: 8, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (dm / 200) * 100)}%`,
                            background: 'oklch(0.48 0.17 196)',
                            borderRadius: 100,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      )}
                      {(demoStep === 1 || demoStep === 4) && (
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#64748B', textAlign: 'center', margin: 0 }}>
                          {dm}m / 200m walked
                        </p>
                      )}
                      {/* Skip buttons for steps 2 and 3 */}
                      {demoStep === 2 && (
                        <button onClick={() => { setDemoToiletDone(true); setDemoNudge(null) }}
                          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', textDecoration: 'underline', cursor: 'pointer', padding: '4px 0', minHeight: 36 }}>
                          Bruno didn't go — skip this step →
                        </button>
                      )}
                      {demoStep === 3 && (
                        <button onClick={() => { setDemoPottyDone(true); setDemoNudge(null) }}
                          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', textDecoration: 'underline', cursor: 'pointer', padding: '4px 0', minHeight: 36 }}>
                          Bruno didn't go — skip this step →
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Keep screen open banner — real walks only */}
                {!isDemoWalk && (
                <div className="rounded-2xl px-3 py-2 flex items-center gap-2"
                  style={{ background: 'oklch(0.97 0.02 196)', border: '1px solid oklch(0.88 0.06 196)', boxShadow: CLAY_SHADOW_TEAL_ACCENT }}>
                  <span className="text-base flex-shrink-0">📱</span>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'oklch(0.40 0.17 196)', margin: 0, fontWeight: 600 }}>
                    Keep this screen open during the walk to track GPS
                  </p>
                </div>
                )}

                {/* Pee / Poop tap buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Toilet button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (peeTapLocked) return
                      setPeeTapLocked(true)
                      handlePeeTap()
                      setTimeout(() => setPeeTapLocked(false), 700)
                    }}
                    disabled={peeTapLocked}
                    className="rounded-[20px] border-2 border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-transform disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                    style={{ minHeight: 80, boxShadow: CLAY_SHADOW_BLUE }}
                  >
                    <span className="text-3xl">{peeTapLocked ? '✅' : '💧'}</span>
                    <span className="text-sm font-bold text-blue-700" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      {peeTapLocked ? t.logged : t.toiletLabel}
                    </span>
                    {livePeeCount > 0 && (
                      <span className="text-xs font-bold text-blue-500 bg-blue-100 rounded-full px-2 py-0.5">
                        💧 {livePeeCount}
                      </span>
                    )}
                  </button>

                  {/* Potty button */}
                  <div className="flex flex-col gap-1">
                    {(careFocusKeys.includes('stomach') || careFocusKeys.includes('recovery')) && (
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, color: '#854D0E', textAlign: 'center', margin: 0 }}>📸 Photo important today</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (poopTapLocked) return
                        setPoopTapLocked(true)
                        handlePoopTap()
                        setTimeout(() => setPoopTapLocked(false), 700)
                      }}
                      disabled={poopTapLocked}
                      className="rounded-[20px] border-2 border-amber-200 bg-amber-50 flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-transform disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                      style={{
                        minHeight: 80,
                        boxShadow: (careFocusKeys.includes('stomach') || careFocusKeys.includes('recovery'))
                          ? `${CLAY_SHADOW_AMBER}, 0 0 0 3px rgba(255,140,82,0.4)`
                          : CLAY_SHADOW_AMBER,
                      }}
                    >
                      <span className="text-3xl">{poopTapLocked ? '✅' : '💩'}</span>
                      <span className="text-sm font-bold text-amber-700" style={{ fontFamily: 'var(--font-fredoka)' }}>
                        {poopTapLocked ? t.logged : t.pottyLabel}
                      </span>
                      {livePoopCount > 0 && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                          💩 {livePoopCount}
                          {poopPhotoUploading && ' ⏳'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Poop photo thumbnails strip */}
                {poopPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {poopPhotos.map((ev, i) => (
                      ev.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={ev.photoUrl}
                          alt={`Poop photo ${i + 1}`}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow"
                        />
                      ) : null
                    ))}
                  </div>
                )}

                {/* End Walk button */}
                <div className="mt-auto">
                  {isDemoWalk && demoStep < 5 ? (
                    <div style={{ background: '#F1F5F9', borderRadius: 20, padding: '14px 16px', textAlign: 'center', boxShadow: CLAY_SHADOW_NEUTRAL }}>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0, fontWeight: 600 }}>
                        Complete the steps above first · {Math.max(0, Math.round(200 - distanceKm * 1000))}m remaining
                      </p>
                    </div>
                  ) : (
                    <LoadingButton
                      loading={endingWalk}
                      loadingText="Ending walk…"
                      onClick={() => {
                        if (endingWalk) return
                        setEndingWalk(true)
                        try {
                          endWalk()
                        } finally {
                          // endWalk() may just show a demo "walk more" nudge without
                          // changing phase — re-enable so the walker can tap again.
                          setEndingWalk(false)
                        }
                      }}
                      className="rounded-[20px] text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                      style={{ minHeight: 56, background: isDemoWalk ? '#FF8C52' : '#DC2626', fontSize: 20, boxShadow: isDemoWalk ? CLAY_SHADOW_ORANGE : CLAY_SHADOW_RED }}
                    >
                      {isDemoWalk ? t.endPracticeWalk : t.endWalk}
                    </LoadingButton>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── LOGGING PHASE ─── */}
          {phase === 'logging' && (
            <div className="px-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* A) Walk summary card */}
                {(() => {
                  const finalPoopCount = walkEvents.filter(e => e.type === 'poop').length
                  const finalPeeCount = walkEvents.filter(e => e.type === 'pee').length
                  return (
                    <div style={{ background: 'oklch(0.94 0.06 196)', borderRadius: 24, padding: '14px 16px', boxShadow: CLAY_SHADOW_TEAL_ACCENT }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: 'oklch(0.40 0.17 196)', margin: '0 0 6px' }}>
                        This walk summary
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>⏱ {Math.floor(elapsed / 60)} min</span>
                        {distanceKm > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>📍 {distanceKm.toFixed(1)} km</span>}
                        {finalPoopCount > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>💩 {finalPoopCount} potty</span>}
                        {finalPeeCount > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>💧 {finalPeeCount} toilet</span>}
                      </div>
                    </div>
                  )
                })()}

                {/* B) Dog photo */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    {t.takePhotoOf(dogName)}
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                  {photoUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ maxHeight: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="Walk photo" className="w-full object-cover rounded-xl" style={{ maxHeight: 220 }} />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black bg-opacity-50 text-white text-sm flex items-center justify-center"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed rounded-2xl py-6 flex flex-col items-center gap-2 transition-colors disabled:opacity-60 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                      style={
                        photoUploadError
                          ? { borderColor: '#DC2626', color: '#B91C1C', background: '#FEF2F2' }
                          : { borderColor: 'oklch(0.70 0.13 196)', color: 'oklch(0.48 0.17 196)', background: '#fff', boxShadow: CLAY_SHADOW_TEAL_ACCENT }
                      }
                    >
                      <span className="text-3xl">{uploading ? '⏳' : photoUploadError ? '⚠️' : '📷'}</span>
                      <span className="text-sm font-bold">
                        {uploading ? t.uploadingPhoto : photoUploadError ? t.photoUploadFailed : t.tapToTakePhoto}
                      </span>
                    </button>
                  )}
                </div>

                {/* C) Mood — 3 big emoji buttons */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    {t.howWasDog(dogName)}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOOD_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setMood(mood === opt.value ? '' : opt.value)}
                        className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                        style={{
                          borderColor: mood === opt.value ? 'oklch(0.48 0.17 196)' : '#E2E8F0',
                          background: mood === opt.value ? 'oklch(0.95 0.04 196)' : '#fff',
                          color: mood === opt.value ? 'oklch(0.40 0.17 196)' : '#64748B',
                          boxShadow: mood === opt.value ? CLAY_SHADOW_TEAL_ACCENT : undefined,
                        }}>
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-fredoka)' }}>{moodLabel(t, opt.value)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* D) Notes — small, optional */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    {t.notesLabel}
                  </label>
                  {/* Tap-to-toggle phrases — typing is friction for a walker
                      standing outside with a dog on a leash; tapping isn't.
                      Selected chips highlight and their bullet appears in the
                      list below; tapping again removes it — both directions
                      driven by the same selectedQuickNotes array, no fragile
                      text-matching against freely-typed content. */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {QUICK_NOTES[lang].map((phrase) => {
                      const selected = selectedQuickNotes.includes(phrase)
                      return (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => toggleQuickNote(phrase)}
                          aria-pressed={selected}
                          className="text-xs font-medium px-3 py-1.5 rounded-full border active:scale-[0.97] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                          style={selected
                            ? { borderColor: 'oklch(0.48 0.17 196)', background: 'oklch(0.95 0.04 196)', color: 'oklch(0.40 0.17 196)', fontWeight: 700 }
                            : { borderColor: '#E2E8F0', background: '#fff', color: '#64748B' }
                          }
                        >
                          {phrase}
                        </button>
                      )
                    })}
                  </div>
                  {selectedQuickNotes.length > 0 && (
                    <ul className="list-none m-0 mb-2 px-0 space-y-1">
                      {selectedQuickNotes.map((phrase) => (
                        <li key={phrase} className="text-sm text-slate-700 flex items-start gap-1.5">
                          <span style={{ color: 'oklch(0.48 0.17 196)' }}>•</span>
                          {phrase}
                        </li>
                      ))}
                    </ul>
                  )}
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else to tell the owner? (optional)"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none"
                    style={{ outlineColor: 'oklch(0.48 0.17 196)' }}
                  />
                </div>

                {submitError && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex flex-col gap-2" style={{ boxShadow: CLAY_SHADOW_RED_BANNER }}>
                    <p className="text-sm text-red-700">{submitError}</p>
                    <button
                      type="button"
                      onClick={() => { setSubmitError(null); setPhase('idle') }}
                      className="text-xs font-bold text-red-500 underline text-left"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      ← Back to dashboard
                    </button>
                  </div>
                )}

                <LoadingButton
                  type="submit"
                  loading={submitting || uploading}
                  loadingText={uploading ? t.uploadingPhoto : t.sendingReport}
                  className="rounded-[20px] text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                  style={{ minHeight: 56, background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE }}
                >
                  {t.sendToOwner(dogName)}
                </LoadingButton>
              </form>
            </div>
          )}

          {/* ─── SUCCESS PHASE ─── */}
          {phase === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING}
              className="px-5 flex flex-col items-center text-center pt-8 pb-24">
              {(() => {
                // Use selected connection's dog name — not the URL token's dog
                const selectedConn = connections.find(c => c.token === selectedToken)
                const successDog = selectedConn?.dogName ?? dogName
                return (
                  <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.4, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <span className="text-4xl">✅</span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_EXP, delay: 0.15 }}
                className="text-3xl font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {t.walkDoneTitle(successDog)}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_EXP, delay: 0.22 }}
                className="text-sm text-slate-500 mb-1 leading-relaxed px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                {t.reportSentBody(successDog)}
              </motion.p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 24 }}>
                {t.alsoEmailed}
              </p>

              <div className="w-full max-w-sm space-y-3">
                {/* Primary: send to owner WhatsApp */}
                {parentWaLink && (
                  <a
                    href={parentWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                    style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', fontSize: '17px', boxShadow: CLAY_SHADOW_WHATSAPP }}
                  >
                    {t.sendReportButton(successDog)}
                  </a>
                )}

                {/* Primary action: go back to dashboard to log another walk */}
                <button
                  onClick={() => {
                    setPhase('idle')
                    setReportUrl(null)
                    setParentWaLink(null)
                    // Re-show picker so walker chooses the next dog
                    if (connections.length > 1) setShowPicker(true)
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2F35]"
                  style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)', boxShadow: CLAY_SHADOW_ORANGE }}
                >
                  {t.logAnotherWalk}
                </button>
              </div>
                  </>
                )
              })()}
            </motion.div>
          )}

          {/* ─── WALK HISTORY (shown in idle phase only) ─── */}
          {phase === 'idle' && (
            <div className="px-5 mt-6">
              <h2 className="text-base font-bold text-[#0A2F35] mb-3" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {t.recentWalks}{logs.length > 0 ? ` (${logs.length})` : ''}
              </h2>

              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" style={{ border: '1px solid rgba(226,220,200,0.6)' }} />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white rounded-[24px] px-5 py-8 text-center border border-gray-200" style={{ boxShadow: CLAY_SHADOW_CREAM }}>
                  <p className="text-3xl mb-2">🐾</p>
                  <p className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {t.noWalksYet(dogName)}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const moodOption = MOOD_OPTIONS.find((m) => m.value === log.mood)
                    const statParts: string[] = []
                    if (log.distance_km != null && log.distance_km > 0) statParts.push(`${log.distance_km} km`)
                    if (log.poop_count > 0) statParts.push(`💩 ${log.poop_count} potty`)
                    if (log.pee_count > 0) statParts.push(`💧 ${log.pee_count} toilet`)
                    return (
                      <div key={log.id} className="bg-white rounded-[24px] px-4 py-4 border border-gray-200" style={{ boxShadow: CLAY_SHADOW_CREAM }}>
                        {/* Title row: duration left, date right */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
                            {log.duration_mins ? t.minWalk(log.duration_mins) : t.walkWord}
                          </p>
                          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        {/* Stats line — only non-zero values */}
                        {statParts.length > 0 && (
                          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', margin: '0 0 4px' }}>
                            {statParts.join(' · ')}
                          </p>
                        )}
                        {/* Mood */}
                        {moodOption && (
                          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', margin: '0 0 4px' }}>
                            {moodOption.emoji} {moodLabel(t, moodOption.value)}
                          </p>
                        )}
                        {/* Report confirmation */}
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#CBD5E1', margin: 0 }}>
                          {t.reportSentToOwner(dogName)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Bookmark hint */}
              <div className="mt-6 rounded-2xl border px-4 py-3 text-center" style={{ background: 'rgba(10,47,53,0.05)', borderColor: 'rgba(10,47,53,0.10)', boxShadow: CLAY_SHADOW_NEUTRAL }}>
                <p className="text-xs font-medium" style={{ color: '#0D3D45' }}>📌 Bookmark this page — it&apos;s your permanent walk log</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === 'settings' && (
        <SettingsTab
          token={token}
          walkerName={walkerName}
          walkerPhone={walkerPhone}
          walkerRole={walkerRole}
          dogName={dogName}
          dogBreed={dogBreed}
          dogPhotoUrl={dogPhotoUrl}
          healthNotes={healthNotes}
          ownerFirstName={ownerFirstName}
          ownerPhone={ownerPhone}
          careFocus={careFocus}
          showToast={(msg) => {
            setToast(msg)
            setTimeout(() => setToast(null), 3000)
          }}
          addClientOtp={addClientOtp}
          setAddClientOtp={setAddClientOtp}
          addClientLoading={addClientLoading}
          setAddClientLoading={setAddClientLoading}
          addClientSuccess={addClientSuccess}
          setAddClientSuccess={setAddClientSuccess}
          addClientError={addClientError}
          setAddClientError={setAddClientError}
          t={t}
        />
      )}

      {/* ─── BOTTOM NAV ───
          Hidden once a walk actually starts (walking/logging) — a walker
          mid-task doesn't need Settings one tap away, and the always-on bar
          read as an interruption sitting over the live map/form. The
          floating "← Back" button already on the walking screen covers
          exiting back to idle if needed. Nav returns for idle/success. */}
      {(phase === 'idle' || phase === 'success') && (
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t flex"
        style={{
          borderColor: 'oklch(0.906 0.06 88)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
      >
        {(
          [
            { tab: 'walk' as WalkerTab, icon: '🐾', label: t.tabWalk },
            { tab: 'settings' as WalkerTab, icon: '⚙️', label: t.tabSettings },
          ] as const
        ).map(({ tab, icon, label }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
          >
            <span
              className={`flex flex-col items-center justify-center rounded-full px-4 py-1.5 gap-0.5 transition-all ${
                activeTab === tab ? 'bg-teal-50' : ''
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span
                className={`text-[11px] font-bold leading-none ${
                  activeTab === tab ? 'text-[oklch(0.48_0.17_196)]' : 'text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {label}
              </span>
            </span>
          </button>
        ))}
      </nav>
      )}
    </div>
  )
}
