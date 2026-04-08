# Safer (سفر) — Progress Log

**Last updated:** April 4, 2026

---

## 1. Project Overview

Safer is a collaborative group travel planning and booking app. The core problem it solves: coordinating a trip with a group is painful — everyone has different budgets, travel styles, and deal-breakers, so nothing gets decided and no one books anything.

**Core MVP:** Each member independently fills in their travel preferences. An AI engine (Claude Sonnet 4.6) analyzes the full group's preferences, finds the best-fit destinations with a compromise explanation, and surfaces a shortlist. The group then browses hotels, flights, and experiences — and books everything in one place.

The differentiator is not just discovery — it's the AI-mediated consensus layer that removes the group chat paralysis and gets the trip booked.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database & Auth | Supabase (PostgreSQL + RLS + Realtime) |
| AI Engine | Anthropic Claude Sonnet 4.6 (matching) + Haiku 4.5 (IATA/coords/experiences) |
| Flights | Duffel API (test mode, live) |
| Hotels | Hotelbeds API (test mode, live) |
| Experiences | Claude AI — personalised, in-app (Viator affiliate pending) |
| Payments | Stripe (pending) |
| Deployment | Vercel (pending DNS setup) |

---

## 3. API Keys Status

| Service | Status | Key Location |
|---|---|---|
| Supabase | ✅ Live | `.env.local` |
| Anthropic (Claude) | ✅ Live | `.env.local` |
| Duffel (flights) | ✅ Live (test mode) | `.env.local` |
| Hotelbeds | ✅ Live (test mode) | `.env.local` |
| Viator | ⏳ Affiliate approval pending | — |
| Stripe | ⏳ Pending account | — |

---

## 4. What's Been Built

### Frontend Routes

| Route | Status | Description |
|---|---|---|
| `/` | ✅ | Landing page — logo, tagline, Start a Trip / Join a Trip CTAs |
| `/login` | ✅ | Email/password sign-in via Supabase Auth |
| `/signup` | ✅ | Account creation, redirects to onboarding |
| `/onboarding` | ✅ | **9-step** preference flow: travel style → budget → trip length → flight pref → hotel pref → amenities → departure city → **interests (multi-select, max 4)** → **travel pace** |
| `/trips/new` | ✅ | Trip creation with fast-track option (skip AI matching, go straight to plan) |
| `/trips/[id]/preferences` | ✅ | Real-time group progress tracker — who has/hasn't completed preferences. Copyable invite link. |
| `/join` | ✅ | Enter invite code → join trip → onboarding |
| `/trips/[id]/results` | ✅ | AI destination shortlist — worldwide recommendations with inline destination details, member scores, select destination |
| `/trips/[id]/plan` | ✅ | Modular booking flow — **"What do you need?" toggle step** (flights / accommodation / experiences), **date gate modal** (required before flights/hotels), then filtered plan sections |
| `/trips/[id]/flights` | ✅ | Multi-city flight search via Duffel — grouped by departure city, confirmation bottom sheet, saves to `trip_flights` |
| `/trips/[id]/hotels` | ✅ | Hotelbeds geolocation search — progressive radius (20→50→150km), confirmation sheet, saves to `trip_hotels`, graceful test-mode fallback |
| `/trips/[id]/experiences` | ✅ | **AI-powered** — Claude Haiku generates 6 personalised recommendations based on organizer's interests + travel pace. Save to itinerary → `trip_experiences`. Note shown: book at checkout after confirming flights/hotel. |
| `/trips/[id]/checkout` | ✅ | Trip summary + selected flight + hotel + saved experiences (title + est_cost per line). Per-currency totals. Dynamic "Book" button. Stripe + Viator coming-soon placeholders. |

### API Routes

| Route | Method | Description |
|---|---|---|
| `/api/trips/[id]/match` | POST | Claude Sonnet 4.6 — reads all member prefs, returns 3 ranked worldwide destinations with inline details and compromise explanation |
| `/api/trips/[id]/flights` | GET | Claude Haiku maps cities → IATA, Duffel searches per departure city in parallel, returns top 5 cheapest per city |
| `/api/trips/[id]/hotels` | GET | Claude Haiku resolves lat/lon, Hotelbeds geolocation search with radius expansion, future-date enforcement |
| `/api/trips/[id]/experiences` | GET | Claude Haiku generates 6 personalised experience recommendations based on organizer's `interests` + `travel_pace` |

### Database Schema

**Tables (all with RLS):**

| Table | Key Columns |
|---|---|
| `profiles` | id, name, email — auto-created on signup |
| `trips` | name, organizer_id, invite_code, start_date, end_date, `selected_destination` (jsonb), `booking_needs` (jsonb) |
| `trip_members` | trip_id, user_id, role |
| `user_preferences` | user_id, trip_id, travel_style, budget_max, trip_length, flight_preference, hotel_preference, amenities, departure_city, `interests` (text[]), `travel_pace` |
| `destinations` | destination catalog (8 seeded) |
| `trip_shortlist` | trip_id, destination_id (nullable), personality_scores (jsonb with destination_inline) |
| `trip_flights` | trip_id, user_id, duffel_offer_id, offer_data (jsonb), status |
| `trip_hotels` | trip_id, user_id, hotelbeds_rate_key, hotel_data (jsonb), status |
| `trip_experiences` | trip_id, user_id, title, description, why_matches, est_cost, duration |

**Migrations run:**
- `001_fix_trip_shortlist.sql` — drop NOT NULL on destination_id, fix RLS
- `002_add_selected_destination.sql` — add jsonb column to trips
- `003_trip_flights.sql` — create trip_flights with RLS
- `004_trip_hotels.sql` — create trip_hotels with RLS
- `005_user_preferences_interests.sql` — add interests[], travel_pace
- `006_trip_experiences.sql` — create trip_experiences with RLS
- `007_add_booking_needs.sql` — add booking_needs jsonb to trips

---

## 5. Known Issues / To Fix

| Issue | Severity | Notes |
|---|---|---|
| Back-button navigation ignores `booking_needs` | Medium | Flights → Hotels → Experiences back links are hardcoded; should skip based on what modules were selected |
| Fast-track skips interests/pace onboarding | Medium | Users who fast-track in `trips/new` never set interests/travel_pace; experiences AI falls back to empty preferences |
| Flight `offer_data.slices[0].segments[0].airline` key | Medium | Duffel v2 uses `marketing_carrier`/`operating_carrier`, not `airline` — checkout airline name may be blank |
| No auth guard on booking pages | Low | Relies on Supabase RLS; no redirect if user lands directly on a trip they're not a member of |
| Trips created without dates still silently search 30-days-out | Low | Mitigated by new date gate modal on plan page |

---

## 6. What's Next

### Immediate
- [ ] Fix back-button navigation to respect `booking_needs` (skip irrelevant modules)
- [ ] Verify Duffel `offer_data` airline key (`marketing_carrier` vs `airline`)
- [ ] Fast-track flow: prompt for interests/pace on the plan page if preferences incomplete

### Booking layer
- [ ] Stripe payment integration
- [ ] Booking confirmation screen / itinerary view
- [ ] Duffel order creation (book a flight for real)
- [ ] Hotelbeds booking API (production keys needed)

### Nice-to-have V1
- [ ] Save trip for later
- [ ] Push/email notifications when all preferences are in
- [ ] Trip chat (Supabase Realtime)
- [ ] Organizer can re-open preferences round
- [ ] Update PROGRESS.md automatically after each session

---

## 7. Brand

| Element | Value |
|---|---|
| Name | Safer / سفر |
| Tagline | "Plan a trip your whole group agrees on, where everything just works." |
| Sand (background) | `#F5F0E8` |
| Cream (cards) | `#FDFAF5` |
| Ink (text) | `#1A1612` |
| Teal (confirmed/selected) | `#2E7D6B` |
| Gold (accents) | `#C8963E` |
| Burnt Orange (CTAs) | `#B85C1A` |
| Rose (errors/secondary) | `#C4695A` |
| Heading font | Playfair Display |
| Body font | DM Sans |

---

## 8. Business Model

**Supplier commissions only.** No subscription, no booking fees charged to users.

- Duffel flights — commission on ticket price
- Hotelbeds hotels — commission on room rate
- Viator experiences — affiliate commission (V2)
- Potential: white-label to travel agents / corporate travel teams (V2)

---

## 9. Pending Founder Tasks

| Task | Status |
|---|---|
| Hotelbeds production API access | ⏳ Pending — test mode live |
| Viator partner program signup | ⏳ Applied — approval pending |
| Stripe account setup | ⏳ Pending |
| Domain + DNS setup (Vercel) | ⏳ Pending |
| Mercury business bank account | ⏳ Pending |
| E&O insurance (travel agent liability) | ⏳ Research |
| Apple Developer account (for V2 native app) | ⏳ Pending |

---

*Built with Claude Code · Safer is pre-launch · All API keys in `.env.local` (not committed)*
