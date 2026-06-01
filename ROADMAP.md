# PawLocal — Product Roadmap

## Now (active)
- [x] Directory live: dog walking, grooming, vet, pet store, insurance affiliate
- [x] Admin approve / verify flow
- [x] Google Places import (~300 Mumbai businesses)
- [x] Redesigned UI: teal system, DM Serif, Framer Motion, scan-first cards
- [ ] Run migration 004 + import script (pet stores showing on map)
- [ ] Mobile responsiveness
- [ ] Domain: pawlocal.in → Vercel

## V2 (1–3 months)
- [ ] Geolocation — center map on user, distance labels ("0.4 km"), radius filter (1/2/5 km)
- [ ] All-category "Around Me" map — all provider types as colour-coded pins at once
- [ ] Pet Broadcast Alerts — lost pets, vaccination drives, neighbourhood alerts (community hook)
- [ ] AuthBridge background check badge — provider pays ₹299, auto-verified, zero ops cost
- [ ] Three-tier trust system:
        Tier 1 Google synced (unverified)
        Tier 2 Claimed (Aadhaar + phone, identity authenticated)
        Tier 3 Community Approved (5 distinct neighbour vouches or reviews)
- [ ] Basic reviews — 1–5 stars + text, unlocks Community Approved tier
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
