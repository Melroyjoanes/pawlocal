# PawLocal — Product Roadmap

## Positioning
**PawLocal = inDrive of pet services.**
Sploot is Uber — they assign providers, fixed price, no choice.
PawLocal is inDrive — pet owner posts what they need + budget, verified providers respond, deal done on WhatsApp. No booking fee. No middleman cut. Ever.
Two layers: Directory (browse & compare, Practo-style) + Broadcast (post a need, providers bid, inDrive-style).

---

## Now (active)
- [x] Directory live: dog walking, grooming, vet, pet store, insurance affiliate
- [x] Admin approve / verify flow
- [x] Google Places import (~300 Mumbai businesses on map)
- [x] Redesigned UI: teal system, DM Serif, Framer Motion, scan-first cards
- [x] All-pets map (/map) with category filter chips
- [x] Multi-category provider listings
- [x] Address autocomplete on /join form
- [x] Reviews & ratings (submit → admin approves → shows on profile)
- [ ] **Run reviews SQL migration in Supabase** (reviews table doesn't exist yet)
- [ ] Domain: pawlocal.in → Vercel
- [ ] Get Shahrukh listed via /join (dog walking category is empty)
- [ ] Reach 15 dog walkers on the app (unlock Broadcast feature)
- [ ] Email Digit Insurance partnerships@godigit.com for referral code
- [ ] WhatsApp the 60 dog walker leads (CSV at dog-walkers-leads.csv)

## V2 — unlock at 15 walkers
- [ ] **Pet Broadcast** — inDrive model: owner posts need + budget, verified providers respond
        Only verified providers can respond (trust gate)
        Free for owners always. Free for providers until scale.
        Revenue at scale: ₹299/month for providers to see + respond to broadcasts
- [ ] Geolocation — center map on user, distance labels ("0.4 km"), radius filter
- [ ] "Open now" filter — critical for vets (nearest open clinic at 10pm)
- [ ] Species filter — dog / cat / other (instant 2x market, zero new data)
- [ ] "Claim your listing" self-serve flow for Google-imported businesses
- [ ] OG image for WhatsApp share previews
- [ ] Google Search Console setup (rank for "dog walker Juhu")
- [ ] Search + filter (price range, verified only, open now)

## V3 (3–6 months)
- [ ] Live Walk GPS tracker — walker presses "Start Walk", owner sees real-time map
        Walk summary + Pee & Poop report notification at end
        Requires native PWA with background location
- [ ] Proximity sorting — sort providers by distance using device geolocation
- [ ] Swipe stack discovery mode — Tinder-style cards sorted by distance

## V4 (6–12 months)
- [ ] Multi-provider scheduling calendar — shared calendar, last-minute backup matching
- [ ] Booking + payment layer (after traction proves demand)

## V5 (12–18 months)
- [ ] Micro-insurance layer — "PawLocal Protected" sessions insured up to ₹25,000
        Partner with Digit or Tata AIG for embedded micro-insurance
        Shifts liability to insurer, massive anti-disintermediation hook
- [ ] Expand beyond Mumbai (Pune, Bangalore)

---

## The Core Anti-Disintermediation Strategy
The goal: make staying on PawLocal more convenient than bypassing to WhatsApp.

Lock-in hierarchy (build in this order):
1. Trust (Verified badge, reviews, background checks)
2. Utility (GPS tracking, alerts, scheduling)
3. Financial (insurance, payments, receipts)

Disintermediation is a good problem to have — it means transactions are happening.
Focus on acquisition and real provider data first. Retention tools come after traction.
