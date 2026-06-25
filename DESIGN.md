# PupStep — Design System

## Colors
- Primary teal: `oklch(0.48 0.17 196)` — buttons, active states, links
- Orange: `#FF8C52` — primary CTA, Start Walk button
- Cream: `#FFFBEB` — page backgrounds, warm neutrals
- Dark: `#0A2F35` — headings, primary text
- Amber: `#F59E0B` — health note warnings
- White card: `oklch(0.995 0.005 85)` — card surfaces (warm white, never pure)

## Typography
- Headings: `var(--font-fredoka)` — bold, warm, approachable
- Body: `var(--font-nunito)` — readable, clean
- Scale: 11 / 12 / 13 / 14 / 16 / 18 / 22 / 26 / 32px

## Elevation / Shadow
- Card shadow: `0 4px 14px rgba(10,47,53,0.08)`
- Heavy card: `0 8px 24px -4px rgba(10,47,53,0.14)`
- Clay card: `inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)`

## Radius
- Cards: 16px (rounded-2xl)
- Pills/badges: 100px
- Buttons: 12–14px
- Inputs: 10–12px

## Spacing rhythm
4pt base. Common: 8, 12, 16, 20, 24, 32, 48px

## Motion
- Stagger list items: 40ms delay between items
- Enter: opacity 0→1 + translateY 18→0, duration 0.4s ease-out
- Exit: 0.2s ease-in
- Never animate layout properties

## Components
- Bottom nav: fixed, 3 tabs (Home/Reports/Account), teal active pill
- Sticky header: cream bg, logo left, title right
- Section eyebrow: `text-[10px] font-bold uppercase tracking-widest text-stone-400`
- Primary button: orange `#FF8C52`, min-h 56px, Fredoka bold 17px
- Secondary: teal outline, min-h 48px
