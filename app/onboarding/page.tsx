"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import airportData from "@/data/airports.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type Prefs = {
  travelStyle: string;
  budget: number;
  tripLength: string;
  flightPref: string;
  hotelPref: string;
  amenities: string[];
  departureCity: string;
  interests: string[];
  travelPace: string;
};

const INITIAL: Prefs = {
  travelStyle: "",
  budget: 2500,
  tripLength: "",
  flightPref: "",
  hotelPref: "",
  amenities: [],
  departureCity: "",
  interests: [],
  travelPace: "",
};

// ─── Step configs ─────────────────────────────────────────────────────────────

const TRAVEL_STYLES = [
  { id: "relax", label: "Rest & Relax", icon: "🌊", desc: "Beaches, spas, slow mornings" },
  { id: "culture", label: "Culture & History", icon: "🏛", desc: "Museums, local cuisine, stories" },
  { id: "adventure", label: "Adventure", icon: "🧗", desc: "Hiking, thrills, the outdoors" },
  { id: "luxury", label: "Luxury", icon: "✨", desc: "Fine dining, 5-star everything" },
];

const TRIP_LENGTHS = [
  { id: "weekend", label: "Weekend", sub: "2–3 days" },
  { id: "one_week", label: "One Week", sub: "7 days" },
  { id: "two_weeks", label: "Two Weeks", sub: "14 days" },
  { id: "three_plus", label: "Three Weeks+", sub: "21+ days" },
];

const FLIGHT_PREFS = [
  { id: "direct", label: "Direct flights only", icon: "✈️" },
  { id: "layovers", label: "Open to layovers", icon: "🔄" },
  { id: "flexible", label: "Flexible", icon: "🎲" },
];

const HOTEL_PREFS = [
  { id: "budget", label: "Budget", sub: "Clean, affordable stays" },
  { id: "midrange", label: "Mid-range", sub: "Comfort & value" },
  { id: "luxury", label: "Luxury", sub: "Premium experience" },
  { id: "villa", label: "Villa / Private", sub: "Exclusive retreat" },
];

const AMENITIES = [
  { id: "pool", label: "Pool", icon: "🏊" },
  { id: "kids_club", label: "Kids Club", icon: "🧸" },
  { id: "spa", label: "Spa", icon: "💆" },
  { id: "gym", label: "Gym", icon: "🏋️" },
  { id: "beach", label: "Beach Access", icon: "🏖️" },
  { id: "private_pool", label: "Private Pool", icon: "🌴" },
];

const INTERESTS = [
  { id: "beaches_water", label: "Beaches & Water" },
  { id: "food_restaurants", label: "Food & Restaurants" },
  { id: "history_culture", label: "History & Culture" },
  { id: "adventure_sports", label: "Adventure & Sports" },
  { id: "wellness_spa", label: "Wellness & Spa" },
  { id: "nightlife_music", label: "Nightlife & Music" },
  { id: "art_museums", label: "Art & Museums" },
  { id: "shopping", label: "Shopping" },
  { id: "family_activities", label: "Family Activities" },
  { id: "wildlife_nature", label: "Wildlife & Nature" },
];

const TRAVEL_PACES = [
  {
    id: "packed",
    label: "Packed",
    desc: "I want to do everything",
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Mix of plans and downtime",
  },
  {
    id: "relaxed",
    label: "Relaxed",
    desc: "Slow mornings, no rushing",
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");

  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<Prefs>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const totalSteps = 9;
  const progress = (step / totalSteps) * 100;

  function next() {
    if (step < totalSteps) setStep((s) => s + 1);
  }
  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function toggleAmenity(id: string) {
    setPrefs((p) => ({
      ...p,
      amenities: p.amenities.includes(id)
        ? p.amenities.filter((a) => a !== id)
        : [...p.amenities, id],
    }));
  }

  function toggleInterest(id: string) {
    setPrefs((p) => {
      const has = p.interests.includes(id);
      if (has) return { ...p, interests: p.interests.filter((i) => i !== id) };
      if (p.interests.length >= 4) return p; // max 4
      return { ...p, interests: [...p.interests, id] };
    });
  }

  async function finish() {
    console.log("[onboarding] finish() called, step:", step, "tripId:", tripId);
    setSaving(true);
    setFinishError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        router.push("/login");
        return;
      }

      const completedAt = new Date().toISOString();
      const basePayload = {
        user_id: user.id,
        travel_style: prefs.travelStyle,
        budget_max: Math.round(prefs.budget),
        trip_length: prefs.tripLength,
        flight_preference: prefs.flightPref,
        hotel_preference: prefs.hotelPref,
        amenities: prefs.amenities,
        departure_city: prefs.departureCity,
        interests: prefs.interests,
        travel_pace: prefs.travelPace,
        completed_at: completedAt,
      };

      // When trip_id is NULL, PostgreSQL unique indexes treat NULLs as distinct
      // (NULL != NULL), so onConflict:"user_id,trip_id" won't find the existing
      // row and will INSERT a duplicate instead of updating. Use "user_id" alone
      // when saving the global (no-trip) row.
      const { error } = await supabase.from("user_preferences").upsert(
        { ...basePayload, trip_id: tripId ?? null },
        { onConflict: tripId ? "user_id,trip_id" : "user_id" }
      );

      if (error) {
        console.error("[onboarding] Failed to save preferences:", error);
        setFinishError(error.message);
        setSaving(false);
        return;
      }

      // Verify the row landed correctly.
      const verifyQuery = supabase
        .from("user_preferences")
        .select("user_id, trip_id, completed_at")
        .eq("user_id", user.id);
      const { data: savedRow } = await (
        tripId ? verifyQuery.eq("trip_id", tripId) : verifyQuery.is("trip_id", null)
      ).maybeSingle();

      console.log("[onboarding] save verified:", {
        user_id: user.id,
        trip_id: tripId ?? null,
        completed_at: savedRow?.completed_at ?? null,
        row_found: !!savedRow,
      });

      // When saving globally (no trip context), propagate to all trip-scoped rows
      // so the preferences completion check on each trip page shows "Done".
      // We upsert each trip row individually to avoid a bulk-upsert silently
      // discarding conflicts when trip_id IS NULL (PostgreSQL NULL != NULL in
      // unique constraints, so the array upsert path can misbehave).
      if (!tripId) {
        const { data: memberTrips, error: memberErr } = await supabase
          .from("trip_members")
          .select("trip_id")
          .eq("user_id", user.id);

        if (memberErr) {
          console.error("[onboarding] Failed to load member trips:", memberErr);
        }

        if (memberTrips && memberTrips.length > 0) {
          for (const mt of memberTrips) {
            const { error: propErr } = await supabase
              .from("user_preferences")
              .upsert(
                { ...basePayload, trip_id: mt.trip_id },
                { onConflict: "user_id,trip_id" }
              );
            if (propErr) {
              console.error("[onboarding] Propagation failed for trip", mt.trip_id, propErr);
            } else {
              console.log("[onboarding] Propagated to trip:", mt.trip_id);
            }
          }
        }
      }

      if (tripId) {
        const { data: trip } = await supabase
          .from("trips")
          .select("selected_destination")
          .eq("id", tripId)
          .single();
        if (trip?.selected_destination) {
          router.push(`/trips/${tripId}/plan`);
        } else {
          router.push(`/trips/${tripId}/preferences`);
        }
      } else {
        router.push("/trips/new");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[onboarding] finish() threw:", msg);
      setFinishError(msg);
      setSaving(false);
    }
  }

  return (
    <main
      className="relative flex flex-col min-h-dvh"
      style={{ background: "var(--sand)" }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--teal)" }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-2">
        <button
          onClick={step > 1 ? back : () => router.push("/")}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>
        <span
          className="text-sm"
          style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
        >
          {step} of {totalSteps}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-32 max-w-sm mx-auto w-full overflow-hidden">
        <div key={step} className="step-enter w-full flex flex-col flex-1">
        {step === 1 && (
          <Step1
            value={prefs.travelStyle}
            onChange={(v) => setPrefs((p) => ({ ...p, travelStyle: v }))}
            onNext={next}
          />
        )}
        {step === 2 && (
          <Step2
            value={prefs.budget}
            onChange={(v) => setPrefs((p) => ({ ...p, budget: v }))}
            onNext={next}
          />
        )}
        {step === 3 && (
          <Step3
            value={prefs.tripLength}
            onChange={(v) => setPrefs((p) => ({ ...p, tripLength: v }))}
            onNext={next}
          />
        )}
        {step === 4 && (
          <Step4
            value={prefs.flightPref}
            onChange={(v) => setPrefs((p) => ({ ...p, flightPref: v }))}
            onNext={next}
          />
        )}
        {step === 5 && (
          <Step5
            value={prefs.hotelPref}
            onChange={(v) => setPrefs((p) => ({ ...p, hotelPref: v }))}
            onNext={next}
          />
        )}
        {step === 6 && (
          <Step6
            value={prefs.amenities}
            onToggle={toggleAmenity}
            onNext={next}
          />
        )}
        {step === 7 && (
          <Step7
            value={prefs.departureCity}
            onChange={(v) => setPrefs((p) => ({ ...p, departureCity: v }))}
            onNext={next}
          />
        )}
        {step === 8 && (
          <Step8
            value={prefs.interests}
            onToggle={toggleInterest}
            onNext={next}
          />
        )}
        {step === 9 && (
          <Step9
            value={prefs.travelPace}
            onChange={(v) => setPrefs((p) => ({ ...p, travelPace: v }))}
            onFinish={finish}
            saving={saving}
            finishError={finishError}
          />
        )}
        </div>
      </div>
    </main>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="w-full flex flex-col gap-2 mb-8">
      <p
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}
      >
        Step {step}
      </p>
      <h2
        className="text-2xl font-bold leading-snug"
        style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
      >
        {title}
      </h2>
      <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
        {subtitle}
      </p>
    </div>
  );
}

function NextButton({ onClick, disabled, label = "Continue" }: { onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
      style={{
        background: disabled ? "var(--border)" : "var(--burnt-orange)",
        color: disabled ? "var(--ink-muted)" : "var(--cream)",
        fontFamily: "var(--font-dm-sans)",
        boxShadow: disabled ? "none" : "0 4px 16px rgba(184,92,26,0.24)",
      }}
    >
      {label}
    </button>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader step={1} title="What's your travel style?" subtitle="Pick the vibe that fits you best." />
      <div className="w-full flex flex-col gap-3 mb-8">
        {TRAVEL_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => { onChange(s.id); }}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: value === s.id ? "rgba(46,125,107,0.1)" : "var(--cream)",
              border: `1.5px solid ${value === s.id ? "var(--teal)" : "var(--border)"}`,
            }}
          >
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: value === s.id ? "var(--teal)" : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
              >
                {s.label}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
              >
                {s.desc}
              </p>
            </div>
            {value === s.id && (
              <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--teal)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <NextButton onClick={onNext} disabled={!value} />
    </>
  );
}

function Step2({ value, onChange, onNext }: { value: number; onChange: (v: number) => void; onNext: () => void }) {
  const formatted = value >= 10000 ? "$10,000+" : `$${value.toLocaleString()}`;
  return (
    <>
      <StepHeader step={2} title="Budget per person?" subtitle="We'll find options that fit your range." />
      <div
        className="w-full p-6 rounded-3xl flex flex-col gap-6 mb-8"
        style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
      >
        <div className="text-center">
          <span
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            {formatted}
          </span>
          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            per person
          </p>
        </div>

        <div className="relative">
          <input
            type="range"
            min={500}
            max={10000}
            step={250}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--teal) 0%, var(--teal) ${((value - 500) / 9500) * 100}%, var(--border) ${((value - 500) / 9500) * 100}%, var(--border) 100%)`,
            }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: var(--teal);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(46,125,107,0.3);
              cursor: pointer;
            }
          `}</style>
        </div>

        <div className="flex justify-between text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          <span>$500</span>
          <span>$10,000+</span>
        </div>
      </div>
      <NextButton onClick={onNext} />
    </>
  );
}

function Step3({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader step={3} title="How long is the trip?" subtitle="Pick the duration that works for you." />
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        {TRIP_LENGTHS.map((l) => (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            className="flex flex-col items-center gap-1 px-4 py-5 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: value === l.id ? "rgba(46,125,107,0.1)" : "var(--cream)",
              border: `1.5px solid ${value === l.id ? "var(--teal)" : "var(--border)"}`,
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: value === l.id ? "var(--teal)" : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
            >
              {l.label}
            </p>
            <p className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              {l.sub}
            </p>
          </button>
        ))}
      </div>
      <NextButton onClick={onNext} disabled={!value} />
    </>
  );
}

function Step4({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader step={4} title="Flight preference?" subtitle="How do you feel about connections?" />
      <div className="w-full flex flex-col gap-3 mb-8">
        {FLIGHT_PREFS.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: value === f.id ? "rgba(46,125,107,0.1)" : "var(--cream)",
              border: `1.5px solid ${value === f.id ? "var(--teal)" : "var(--border)"}`,
            }}
          >
            <span className="text-xl">{f.icon}</span>
            <p
              className="text-sm font-semibold"
              style={{ color: value === f.id ? "var(--teal)" : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
            >
              {f.label}
            </p>
            {value === f.id && (
              <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--teal)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <NextButton onClick={onNext} disabled={!value} />
    </>
  );
}

function Step5({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader step={5} title="Hotel preference?" subtitle="What kind of stay suits you?" />
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        {HOTEL_PREFS.map((h) => (
          <button
            key={h.id}
            onClick={() => onChange(h.id)}
            className="flex flex-col items-start gap-1 px-4 py-5 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: value === h.id ? "rgba(46,125,107,0.1)" : "var(--cream)",
              border: `1.5px solid ${value === h.id ? "var(--teal)" : "var(--border)"}`,
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: value === h.id ? "var(--teal)" : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
            >
              {h.label}
            </p>
            <p className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              {h.sub}
            </p>
          </button>
        ))}
      </div>
      <NextButton onClick={onNext} disabled={!value} />
    </>
  );
}

function Step6({ value, onToggle, onNext }: { value: string[]; onToggle: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader step={6} title="Must-have amenities?" subtitle="Select everything that matters to you." />
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        {AMENITIES.map((a) => {
          const selected = value.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => onToggle(a.id)}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: selected ? "rgba(46,125,107,0.1)" : "var(--cream)",
                border: `1.5px solid ${selected ? "var(--teal)" : "var(--border)"}`,
              }}
            >
              <span className="text-lg">{a.icon}</span>
              <p
                className="text-sm font-medium"
                style={{ color: selected ? "var(--teal)" : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
              >
                {a.label}
              </p>
            </button>
          );
        })}
      </div>
      <NextButton onClick={onNext} label={value.length === 0 ? "Skip" : "Continue"} />
    </>
  );
}

type Airport = {
  iata_code: string;
  name: string;
  city_name: string | null;
  country_name: string | null;
};

const ALL_AIRPORTS: Airport[] = airportData as Airport[];

function searchAirports(query: string): Airport[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  return ALL_AIRPORTS.filter(
    (a) =>
      a.iata_code.toLowerCase().startsWith(q) ||
      (a.city_name ?? "").toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.country_name ?? "").toLowerCase().includes(q)
  ).slice(0, 6);
}

function AirportSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);

  // Instant local search — no fetch, no debounce
  const results = value ? [] : searchAirports(input);

  function handleSelect(airport: Airport) {
    const display = airport.city_name
      ? `${airport.city_name} (${airport.iata_code})`
      : `${airport.name} (${airport.iata_code})`;
    setInput(display);
    onChange(display);
    setOpen(false);
  }

  function handleChange(v: string) {
    setInput(v);
    onChange(""); // clear confirmed selection while user is typing
    setOpen(true);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. New York, London, Dubai…"
        autoFocus
        className="w-full px-4 py-4 rounded-2xl text-base outline-none transition-all"
        style={{
          background: "var(--cream)",
          border: `1.5px solid ${value ? "var(--teal)" : "var(--border)"}`,
          color: "var(--ink)",
          fontFamily: "var(--font-dm-sans)",
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
      />

      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--cream)",
            border: "1.5px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(26,22,18,0.12)",
          }}
        >
          {results.map((airport, i) => (
            <button
              key={airport.iata_code}
              onMouseDown={() => handleSelect(airport)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
              style={{
                borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                className="shrink-0 px-2 py-0.5 rounded text-xs font-mono font-bold"
                style={{
                  background: "rgba(46,125,107,0.1)",
                  color: "var(--teal)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {airport.iata_code}
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
                >
                  {airport.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
                >
                  {[airport.city_name, airport.country_name].filter(Boolean).join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Step7({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader step={7} title="Where are you flying from?" subtitle="Search for your home airport or nearest city." />
      <div className="w-full mb-8">
        <AirportSearch value={value} onChange={onChange} />
        {!value && (
          <p
            className="text-xs mt-2 px-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
          >
            Select an airport from the list to continue.
          </p>
        )}
      </div>
      <NextButton onClick={onNext} disabled={!value} />
    </>
  );
}

function Step8({ value, onToggle, onNext }: { value: string[]; onToggle: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <StepHeader
        step={8}
        title="What do you enjoy most on a trip?"
        subtitle="Pick up to 4 — we'll use these to personalise your experiences."
      />
      <div className="w-full flex flex-wrap gap-2 mb-8">
        {INTERESTS.map((interest) => {
          const selected = value.includes(interest.id);
          const maxReached = value.length >= 4 && !selected;
          return (
            <button
              key={interest.id}
              onClick={() => onToggle(interest.id)}
              disabled={maxReached}
              className="px-4 py-2.5 rounded-full text-sm font-medium transition-all active:scale-[0.96] disabled:opacity-40"
              style={{
                background: selected ? "var(--teal)" : "var(--cream)",
                color: selected ? "var(--cream)" : "var(--ink)",
                border: `1.5px solid ${selected ? "var(--teal)" : "var(--border)"}`,
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {interest.label}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="w-full text-xs mb-4" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          {value.length}/4 selected
        </p>
      )}
      <NextButton onClick={onNext} disabled={value.length === 0} label={value.length === 0 ? "Select at least one" : "Continue"} />
    </>
  );
}

function Step9({
  value,
  onChange,
  onFinish,
  saving,
  finishError,
}: {
  value: string;
  onChange: (v: string) => void;
  onFinish: () => void;
  saving: boolean;
  finishError: string | null;
}) {
  return (
    <>
      <StepHeader step={9} title="What's your travel pace?" subtitle="This shapes how we plan your days." />
      <div className="w-full flex flex-col gap-3 mb-8">
        {TRAVEL_PACES.map((pace) => (
          <button
            key={pace.id}
            onClick={() => onChange(pace.id)}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: value === pace.id ? "rgba(46,125,107,0.1)" : "var(--cream)",
              border: `1.5px solid ${value === pace.id ? "var(--teal)" : "var(--border)"}`,
            }}
          >
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: value === pace.id ? "var(--teal)" : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
              >
                {pace.label}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
              >
                {pace.desc}
              </p>
            </div>
            {value === pace.id && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--teal)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={!value || saving}
        className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        style={{
          background: !value || saving ? "var(--border)" : "var(--teal)",
          color: !value || saving ? "var(--ink-muted)" : "var(--cream)",
          fontFamily: "var(--font-dm-sans)",
          boxShadow: !value || saving ? "none" : "0 4px 16px rgba(46,125,107,0.24)",
        }}
      >
        {saving && (
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {saving ? "Saving…" : "All done — let's go ✈️"}
      </button>
      {finishError && (
        <p className="text-sm text-center mt-2" style={{ color: "var(--error, #e53e3e)", fontFamily: "var(--font-dm-sans)" }}>
          {finishError}
        </p>
      )}
    </>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
