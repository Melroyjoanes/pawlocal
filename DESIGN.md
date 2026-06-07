# PawLocal Design System

## Brand in one sentence
A warm, neighbourhood notice board for pet services in Juhu — trustworthy enough for a vet recommendation, personal enough that it feels like a friend told you.

---

## Color System

All colours in OKLCH. Neutral tints use chroma 0.008–0.018 toward amber hue (88°).

### Named roles

| Token | OKLCH | Hex approx | Usage |
|---|---|---|---|
| `--pl-bg` | `oklch(0.988 0.018 88)` | `#FFFBEB` | Page background — warm amber cream |
| `--pl-teal` | `oklch(0.48 0.17 196)` | `#0B7A8A` | Primary action, links, Verified badge |
| `--pl-teal-deep` | `oklch(0.36 0.14 198)` | `#065A67` | Teal button press shadow |
| `--pl-amber` | `oklch(0.65 0.18 75)` | `#D97706` | Hero accent, section labels, count badges |
| `--pl-amber-light` | `oklch(0.97 0.05 75)` | `#FEF3C7` | Amber chip backgrounds |
| `--border` | `oklch(0.92 0.018 88)` | `#E9DDBF` | Card borders, dividers |

### Per-category palette (clay backgrounds)

| Category | Gradient | Dark text |
|---|---|---|
| Dog Walking | `#FEF9C3 → #FDE68A` (lemon) | `#78350F` |
| Grooming | `#F5F3FF → #E9D5FF` (lavender) | `#4C1D95` |
| Vet | `#FFF1F2 → #FECDD3` (rose) | `#9F1239` |
| Pet Store | `#F0FDF4 → #BBF7D0` (mint) | `#064E3B` |
| Dog Training | `#E0F2FE → #BAE6FD` (sky) | `#0C4A6E` |
| Insurance | `#FEFCE8 → #FEF08A` (bright lemon) | `#713F12` |

### Rules
- Never use pure `#000` or `#fff` — always tint toward amber hue
- High-chroma colours (amber, teal) at 30–60% opacity max on page backgrounds
- Error states: `oklch(0.577 0.245 27)` (warm red, not blue-red)
- Success states: `oklch(0.52 0.17 155)` (emerald green)

---

## Typography

### Font stack
- **Display / headings:** `DM Serif Display` (serif, Google Fonts) — used for H1, H2, section headlines
- **Body / UI:** `Inter` (sans-serif, system fallback) — all body copy, labels, buttons, meta
- **Mono:** `Geist Mono` — prices, code, numeric data

### Scale (base 16px)

| Step | Size | Weight | Font | Usage |
|---|---|---|---|---|
| `display` | clamp(2.6rem, 5.5vw, 4.8rem) | 400 | DM Serif Display | Hero H1 only |
| `h1` | 2rem (32px) | 400 | DM Serif Display | Page titles |
| `h2` | 1.75rem (28px) | 400 | DM Serif Display | Section headings |
| `h3` | 1.125rem (18px) | 700 | Inter | Card headings, feature titles |
| `body` | 1rem (16px) | 400 | Inter | Paragraphs, descriptions |
| `small` | 0.875rem (14px) | 400/500 | Inter | Meta, secondary info |
| `label` | 0.75rem (12px) | 600–700 | Inter | Buttons, badges, tags |
| `micro` | 0.625rem (10px) | 700 | Inter | Eyebrow caps, very small chips |

### Rules
- Cap body line length at 65ch (max-w-prose)
- Line height: 1.5 body, 1.1 display, 1.35 UI elements
- Eyebrow labels: `text-xs font-bold uppercase tracking-widest` in `--pl-amber`
- Never use `font-display` (DM Serif) below 18px — it loses legibility

---

## Claymorphism Shadow System

Five named shadow tokens, all combining three layers:
1. **Top inset highlight** — `inset 0 1.5px 0 rgba(255,255,255,0.85)` — light catches the top edge
2. **Bottom press ridge** — `inset 0 -3px 0 rgba(0,0,0,0.08)` — gives the "thick" clay feel
3. **Outer glow** — ambient shadow matching the card colour

```css
--sh-clay:       /* White/cream card */
  inset 0 1.5px 0 rgba(255,255,255,0.85),
  inset 0 -3px 0 rgba(0,0,0,0.08),
  0 10px 28px rgba(15,45,50,0.10),
  0 3px 8px rgba(15,45,50,0.06);

--sh-clay-hover: /* Lifted state */
  inset 0 1.5px 0 rgba(255,255,255,0.9),
  inset 0 -3px 0 rgba(0,0,0,0.10),
  0 18px 40px rgba(15,45,50,0.14),
  0 6px 14px rgba(15,45,50,0.08);

--sh-clay-teal:  /* Primary teal button */
  inset 0 1.5px 0 rgba(255,255,255,0.22),
  inset 0 -4px 0 var(--pl-teal-deep),
  0 12px 32px oklch(0.48 0.17 196 / 0.42);

--sh-clay-amber: /* Golden CTA button */
  inset 0 1.5px 0 rgba(255,255,255,0.45),
  inset 0 -4px 0 rgba(120,53,15,0.28),
  0 10px 28px rgba(253,230,138,0.65),
  0 4px 8px rgba(180,83,9,0.18);

--sh-clay-wa:    /* WhatsApp green button */
  inset 0 1.5px 0 rgba(255,255,255,0.22),
  inset 0 -4px 0 rgba(14,100,55,0.50),
  0 12px 28px rgba(37,211,102,0.35);

--sh-clay-ghost: /* Secondary ghost button */
  inset 0 1.5px 0 rgba(255,255,255,0.95),
  inset 0 -2.5px 0 rgba(0,0,0,0.06),
  0 6px 20px rgba(0,0,0,0.07),
  0 2px 6px rgba(0,0,0,0.04);
```

### Radius scale

| Token | Value | Usage |
|---|---|---|
| `--radius` (base) | `1rem` (16px) | Inputs, small chips |
| `rounded-xl` | 12px | Small buttons, tags |
| `rounded-2xl` | 16px (base) | Cards, modals, panels |
| `borderRadius: 24` | 24px | Primary cards (CategoryCard, ProviderCard) |
| `rounded-full` | 9999px | Pills, badges, avatar rings |

---

## Component Patterns

### `.clay-card`
```css
background: linear-gradient(160deg, #ffffff 0%, #fffdf7 100%);
box-shadow: var(--sh-clay);
border: 1px solid rgba(226,220,200,0.7);
border-radius: 24px;
transition: box-shadow 0.22s ease, transform 0.22s ease;
```
Hover: `translateY(-2px)` + `--sh-clay-hover`.

### `.clay-btn-teal` — primary action
Teal gradient, white text, `--sh-clay-teal`. Border radius `9999px`.

### `.clay-btn-amber` — golden CTA
`#FCD34D → #F59E0B` gradient, `#451A03` text, `--sh-clay-amber`. Border radius `9999px`.

### `.clay-btn-wa` — WhatsApp
`#25D366 → #1aad54` gradient, white text, `--sh-clay-wa`. Border radius `9999px`.

### `.clay-btn-ghost` — secondary
White gradient, `#1a2233` text, `--sh-clay-ghost`. Border radius `9999px`.

### `.clay-badge-amber` — count pill
`#FEF3C7 → #FDE68A` gradient, `#78350F` text. Border radius `9999px`.

### `.clay-chip` — filter / tag pill
Box shadow only (no gradient background — inherits from parent). Hover lifts `translateY(-1px)`.

---

## Spacing & Layout

### Grid
- Mobile: single column, `px-4` (16px) horizontal gutter
- Tablet (≥640px): 2 columns for cards
- Desktop (≥1024px): 2-column hero split, 3-column category grid
- Max content width: `max-w-7xl` (1280px) centred

### Spacing rhythm (8px base)
```
4px  — gap between inline chips
8px  — between list items
12px — between card inner sections
16px — card padding (mobile)
20px — card padding (desktop), section gaps
28px — between sections (mobile)
40px — between sections (desktop)
```

### Mobile-first rules
- All hero content must fit above 480px viewport height without scrolling
- Sticky CTA bar height: 76px + `env(safe-area-inset-bottom)`
- Minimum tap target: 44×44px (Apple HIG)
- Touch spacing: 8px minimum between adjacent targets

---

## Voice & Copy

### Brand voice
Warm, direct, knowledgeable. The Practo of pet services: professional without being clinical, local without being scrappy.

### Juhu-specific copy patterns
- Always name the neighbourhood: "in Juhu", "near Juhu Beach", "Juhu, Mumbai"
- Expand naturally: "Serving Juhu, Versova, Andheri West, Santacruz West"
- Local landmarks for SEO: "near Juhu Beach", "Vile Parle West", "JVPD Scheme"
- Never "near you" in static copy — always name the area

### ✅ DO
- "Find a trusted groomer in Juhu." — specific, confident
- "WhatsApp direct — no middleman." — clear benefit, no jargon
- "Every listing manually reviewed by our team." — earns trust
- "₹0 booking fee. Always." — definitive, no asterisk

### ❌ DON'T
- "Simpler than ordering food" — Zomato/Swiggy is an anti-reference
- "Like Uber/inDrive for pets" — drops competitor brand names
- "Book in seconds" — implies urgency, wrong for research-first
- "Expanding soon!" — premature promises damage trust
- "127+ reviews" — never show fake or inflated stats
- "No account required" — incorrect once auth is live

### SEO headline patterns for Juhu
- `[Service] in Juhu, Mumbai` — category pages
- `Best [service] near Juhu Beach` — high-intent search
- `Verified [profession] in Juhu and Andheri West` — breadth signal
- `Pet services near JVPD Scheme, Mumbai` — hyperlocal long-tail

---

## Motion

### Principles
- Ease out with exponential curves: `[0.25, 0.46, 0.45, 0.94]`
- No bounce, no elastic
- Duration: 150–300ms micro, 400–550ms page transitions
- Respect `prefers-reduced-motion` — all animations off at system level

### Named eases
```js
const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94]
```

### Clay card hover
`translateY(-2px)` + shadow lift, `0.22s ease`. Spring on interactive elements: `stiffness: 400, damping: 25`.

### Enter animations
```js
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.45, ease: EASE_OUT_QUART }}
```
Stagger list items: `delay: index * 0.04` (max 0.24s).

---

## Accessibility Baseline
- WCAG AA contrast on all text/background pairs (4.5:1 normal, 3:1 large)
- All interactive elements: visible `focus-visible` ring using `--pl-teal`
- Minimum 44px touch targets on mobile
- `prefers-reduced-motion`: disable all transforms and transitions
- `alt` text on all images; decorative images `alt=""`
- Form labels always visible (never placeholder-only)
