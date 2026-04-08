"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fast-track state
  const [fastName, setFastName] = useState("");
  const [fastDest, setFastDest] = useState("");
  const [fastLoading, setFastLoading] = useState(false);

  async function createTrip(tripName: string, start?: string, end?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return null;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error: err } = await supabase
      .from("trips")
      .insert({
        name: tripName,
        start_date: start || null,
        end_date: end || null,
        organizer_id: user.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (err) return { error: err.message, data: null };

    await supabase.from("trip_members").insert({
      trip_id: data.id,
      user_id: user.id,
      role: "organizer",
    });

    const { data: existingPrefs } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .is("trip_id", null)
      .single();

    if (existingPrefs) {
      await supabase.from("user_preferences").insert({
        user_id: existingPrefs.user_id,
        trip_id: data.id,
        travel_style: existingPrefs.travel_style,
        budget_max: existingPrefs.budget_max,
        trip_length: existingPrefs.trip_length,
        flight_preference: existingPrefs.flight_preference,
        hotel_preference: existingPrefs.hotel_preference,
        amenities: existingPrefs.amenities,
        departure_city: existingPrefs.departure_city,
        completed_at: existingPrefs.completed_at ?? new Date().toISOString(),
      });
    }

    return { data, error: null };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createTrip(name, startDate, endDate);
    if (!result) return;
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/trips/${result.data.id}/preferences`);
  }

  async function handleFastTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!fastName.trim() || !fastDest.trim()) return;
    setFastLoading(true);

    const result = await createTrip(fastName);
    if (!result) return;
    if (result.error) {
      setFastLoading(false);
      return;
    }

    // Save destination inline so the plan page works immediately
    await supabase
      .from("trips")
      .update({
        selected_destination: {
          name: fastDest.trim(),
          country: "",
          description: "",
          image_url: null,
          image_search_query: fastDest.trim() + " travel",
          tags: [],
          destination_id: null,
        },
      })
      .eq("id", result.data.id);

    router.push(`/onboarding?trip=${result.data.id}`);
  }

  return (
    <main
      className="relative flex flex-col items-center justify-center min-h-dvh px-6 py-12"
      style={{ background: "var(--sand)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 70% 30%, rgba(200,150,62,0.07) 0%, transparent 55%)`,
        }}
      />

      <div className="relative w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="self-start flex items-center gap-1.5 text-sm mb-2"
            style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </Link>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            Start a new trip
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Name it, set a rough window, then invite your group.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-5 p-6 rounded-3xl"
          style={{
            background: "var(--cream)",
            border: "1.5px solid var(--border)",
            boxShadow: "0 2px 24px rgba(26,22,18,0.06)",
          }}
        >
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(196,105,90,0.1)",
                color: "var(--rose)",
                fontFamily: "var(--font-dm-sans)",
                border: "1px solid rgba(196,105,90,0.2)",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
            >
              Trip name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bali with the squad"
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--sand)",
                border: "1.5px solid var(--border)",
                color: "var(--ink)",
                fontFamily: "var(--font-dm-sans)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div className="flex flex-col gap-3">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
            >
              Rough date range <span style={{ color: "var(--ink-faint)" }}>(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--sand)",
                    border: "1.5px solid var(--border)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--sand)",
                    border: "1.5px solid var(--border)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] mt-2 disabled:opacity-40"
            style={{
              background: loading || !name.trim() ? "var(--border)" : "var(--burnt-orange)",
              color: loading || !name.trim() ? "var(--ink-muted)" : "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: loading || !name.trim() ? "none" : "0 4px 16px rgba(184,92,26,0.24)",
            }}
          >
            {loading ? "Creating trip…" : "Create trip & invite group"}
          </button>
        </form>

        {/* Info */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "rgba(46,125,107,0.06)", border: "1px solid rgba(46,125,107,0.15)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            After creating, you'll get a shareable invite link for your group. Each member fills in their preferences independently.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* Fast track */}
        <form
          onSubmit={handleFastTrack}
          className="flex flex-col gap-4 p-5 rounded-3xl"
          style={{
            background: "var(--cream)",
            border: "1.5px solid var(--border)",
            boxShadow: "0 2px 16px rgba(26,22,18,0.04)",
          }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
              Already know where you're going?
            </p>
            <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
              Skip the AI matching and go straight to planning.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              Trip name
            </label>
            <input
              type="text"
              value={fastName}
              onChange={(e) => setFastName(e.target.value)}
              placeholder="e.g. Rome with the crew"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--sand)",
                border: "1.5px solid var(--border)",
                color: "var(--ink)",
                fontFamily: "var(--font-dm-sans)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              Destination
            </label>
            <input
              type="text"
              value={fastDest}
              onChange={(e) => setFastDest(e.target.value)}
              placeholder="e.g. Rome, Italy"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--sand)",
                border: "1.5px solid var(--border)",
                color: "var(--ink)",
                fontFamily: "var(--font-dm-sans)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <button
            type="submit"
            disabled={fastLoading || !fastName.trim() || !fastDest.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: fastLoading || !fastName.trim() || !fastDest.trim() ? "var(--border)" : "var(--gold)",
              color: fastLoading || !fastName.trim() || !fastDest.trim() ? "var(--ink-muted)" : "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: fastLoading || !fastName.trim() || !fastDest.trim() ? "none" : "0 4px 16px rgba(200,150,62,0.28)",
            }}
          >
            {fastLoading ? "Creating trip…" : "Skip to planning →"}
          </button>
        </form>
      </div>
    </main>
  );
}
