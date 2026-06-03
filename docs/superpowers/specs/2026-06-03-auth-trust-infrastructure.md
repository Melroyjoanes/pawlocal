# PawLocal v2 — Auth + Trust Infrastructure
**Date:** 2026-06-03  
**Status:** Approved for implementation

---

## What We're Building

Eight interconnected systems that transform PawLocal from a directory with hacked WhatsApp verification into a trusted, two-sided marketplace platform. Auth is the foundation. Everything else layers on top.

---

## 1. Auth Foundation (Supabase Auth)

**Methods:** Google OAuth one-tap + Phone SMS OTP  
**Principle:** Auth is never a destination. It appears as a bottom-sheet modal triggered by protected actions.

### Database
```sql
-- profiles: one row per auth user
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin')),
  display_name text,
  avatar_url   text,
  phone        text,
  created_at   timestamptz DEFAULT now()
);

-- link providers to real auth accounts
ALTER TABLE providers ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE providers ADD COLUMN claim_token text UNIQUE; -- for claim flow
ALTER TABLE providers ADD COLUMN claim_token_expires_at timestamptz;
```

### Auth Flow
1. User triggers protected action (save, broadcast, review, dashboard)
2. AuthModal slides up from bottom: Google button (primary) + "Use phone number" (secondary)
3. Google: redirect → callback → profile created → return to page
4. Phone: enter number → 6-digit OTP → profile created → return to page
5. Session persisted via Supabase cookies, auto-refreshed

### Protected Routes (middleware.ts)
- `/my-account` — customer dashboard
- `/provider/[id]/dashboard` — provider dashboard  
- `/provider/[id]/edit` — edit listing
- `/broadcast` — post a need

### Removed
- WhatsApp verify step in edit and dashboard pages
- `/my-listing` page
- `/api/provider/find` route
- `/account` "who are you?" page → replaced by auth-aware session

### Nav Changes
- Logged out: "👤" icon triggers AuthModal
- Logged in: avatar/initials → dropdown (My account / My dashboard if provider / Sign out)

---

## 2. Availability Toggle

**Problem:** Business hours ≠ availability. Providers can be booked out for weeks.

### Database
```sql
ALTER TABLE providers ADD COLUMN is_available boolean NOT NULL DEFAULT true;
ALTER TABLE providers ADD COLUMN availability_note text; -- e.g. "Back June 15"
```

### UI
- **Provider card:** Green "● Available" or red "● Fully booked" pill, replaces nothing, added below name
- **Provider profile:** Same pill, prominent position below header
- **Provider dashboard:** Big toggle "Available for bookings / Fully booked" + optional note field
- Toggle updates via authenticated API (uses session, not WhatsApp verify)

---

## 3. Verification Tiers

**Problem:** "Verified" badge is meaningless without defined criteria.

### Database
```sql
ALTER TABLE providers ADD COLUMN verification_tier text 
  NOT NULL DEFAULT 'contacted' 
  CHECK (verification_tier IN ('contacted', 'verified', 'certified'));
```

### Tiers
| Tier | Badge | Criteria | Who sets it |
|---|---|---|---|
| Contacted | 🐾 Bronze | WhatsApp confirmed active | Auto on first WhatsApp click |
| Verified | 🐾🐾 Silver | Documents + ID checked | Admin in dashboard |
| Certified | 🐾🐾🐾 Gold | Physical visit by PawLocal team | Admin in dashboard |

### UI
- Replaces current "✓ Verified" binary badge with tiered paw icons
- Profile page shows criteria for each tier — transparency builds trust
- Admin dashboard: dropdown to set tier per provider

---

## 4. Search

**Problem:** No way to search. Midnight emergency vet lookup impossible.

### Implementation
- Supabase full-text search: `to_tsvector` on `name || bio || address || business_name`
- Search index migration: `CREATE INDEX providers_fts ON providers USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(bio,'') || ' ' || coalesce(address,'') || ' ' || coalesce(business_name,'')))`
- Search bar in header (collapses to icon on mobile, expands on tap)
- Results page: `/search?q=...`
- Results: provider cards with category filter chips above

---

## 5. Response Rating + Conversion Tracking

**Problem:** WhatsApp is a black hole. We don't know if providers respond.

### Database
```sql
CREATE TABLE provider_contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id       uuid REFERENCES auth.users(id), -- null if anonymous
  session_token     text, -- anonymous tracking
  responded         boolean, -- null = not yet asked
  booked            boolean, -- null = not yet asked
  prompt_sent_at    timestamptz,
  created_at        timestamptz DEFAULT now()
);
```

### Flow
1. Customer taps WhatsApp → contact record created (with session token cookie)
2. 24 hours later → if customer returns to site, ResponsePrompt bottom sheet appears:
   *"Did Ramesh respond to your WhatsApp message?"* 👍 Yes / 👎 No
3. If yes → follow-up: *"Did you end up booking a session?"* 👍 Yes / 👎 No
4. Data feeds `provider_contacts.responded` and `provider_contacts.booked`
5. Provider dashboard shows: "X people WhatsApped you · Y responded back · Z booked"

### Impact on ranking
- Response rate displayed on provider profile as "Responds to X% of messages"
- Providers with <50% response rate flagged in admin dashboard
- Future: low-response providers ranked lower in listings

---

## 6. Onboarding Confirmation (Post-Join)

**Problem:** Providers submit the form and hear nothing. Silence = anxiety = churn.

### Implementation
- `/join/success` page (redirect after form submit)
- Shows: provider name, category, estimated review time (48 hours)
- Timeline component: Submitted → Under Review → Goes Live → Claim Dashboard
- WhatsApp CTA: direct link to WhatsApp PawLocal team with pre-filled message
- "What to expect" accordion: what the review checks, how to claim, how to edit

---

## 7. Re-engagement Loop

**Problem:** Zero re-engagement. Users who leave never come back.

### Implementation (Phase 1 — email via Supabase)
- Welcome email on signup (Supabase built-in template)
- "New providers near you" — weekly digest (Supabase scheduled edge function, Phase 2)
- For now: ensure auth captures email properly and Supabase confirmation email is well-designed

### Provider re-engagement
- After claim: email with dashboard link and "here's how to get your first review"
- Admin can manually trigger "Your listing needs updating" email from admin dashboard

---

## Routes Summary

| Route | Status | Auth |
|---|---|---|
| `/auth/callback` | New | Public |
| `/search` | New | Public |
| `/join/success` | New | Public |
| `/claim/[token]` | New | Requires login |
| `/my-account` | Updated | Requires login |
| `/provider/[id]/dashboard` | Updated | Requires login + owns listing |
| `/provider/[id]/edit` | Updated | Requires login + owns listing |
| `/broadcast` | Updated | Requires login |

---

## Database Migrations

- `012_auth_profiles.sql` — profiles, user_id on providers, claim tokens, is_available, availability_note, verification_tier
- `013_provider_contacts.sql` — contact tracking, response/booking signals
- `014_search_index.sql` — full-text search index on providers

---

## New Components

| Component | Purpose |
|---|---|
| `AuthModal` | Bottom-sheet: Google + OTP, triggered by any protected action |
| `OTPInput` | 6-digit code input with auto-advance |
| `AvailabilityBadge` | Green/red availability pill |
| `VerificationBadge` | Tiered paw icon (bronze/silver/gold) |
| `SearchBar` | Expanding search input in header |
| `ResponsePrompt` | 24h follow-up bottom sheet |
| `UserMenu` | Avatar dropdown in nav when logged in |

---

## What Gets Deleted

- `app/my-listing/page.tsx`
- `app/account/page.tsx`  
- `app/api/provider/find/route.ts`
- WhatsApp verify step inside `EditProviderClient.tsx` and `DashboardClient.tsx`

---

## Implementation Order (for agents)

**Phase 1 — Foundation (sequential, everything depends on this):**
Auth Foundation: Supabase Auth config, profiles table, AuthModal, middleware, nav update, auth callback route

**Phase 2 — Parallel agents (after Phase 1):**
- Agent A: Provider features (availability toggle, verification tiers, provider dashboard auth, claim flow)
- Agent B: Customer features (my-account with real auth, broadcast auth gate, save auth gate, review auth gate)  
- Agent C: Search (FTS index, search bar, results page)
- Agent D: Response tracking (provider_contacts table, WhatsApp click tracking, ResponsePrompt, join/success page)
