"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  name: string | null;
  email: string | null;
};

type Prefs = {
  travel_style: string | null;
  budget_max: number | null;
  trip_length: string | null;
  flight_preference: string | null;
  hotel_preference: string | null;
  departure_city: string | null;
};

const STYLE_LABELS: Record<string, string> = {
  relax: "Rest & Relax",
  culture: "Culture & History",
  adventure: "Adventure",
  luxury: "Luxury",
};

const LENGTH_LABELS: Record<string, string> = {
  weekend: "Weekend (2–3 days)",
  one_week: "One week",
  two_weeks: "Two weeks",
  three_plus: "Three weeks+",
};

const FLIGHT_LABELS: Record<string, string> = {
  direct: "Direct flights only",
  layovers: "Open to layovers",
  flexible: "Flexible",
};

const HOTEL_LABELS: Record<string, string> = {
  budget: "Budget",
  midrange: "Mid-range",
  luxury: "Luxury",
  villa: "Villa / Private",
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const [{ data: profileData }, { data: prefsData }] = await Promise.all([
        supabase.from("profiles").select("name, email").eq("id", session.user.id).single(),
        supabase
          .from("user_preferences")
          .select("travel_style, budget_max, trip_length, flight_preference, hotel_preference, departure_city")
          .eq("user_id", session.user.id)
          .is("trip_id", null)
          .maybeSingle(),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProfile((profileData as any) ?? { name: session.user.email?.split("@")[0], email: session.user.email });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPrefs((prefsData as any) ?? null);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <main className="relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 80% 20%, rgba(200,150,62,0.06) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          Settings
        </h1>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }} />)}
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div
              className="flex items-center gap-4 p-5 rounded-2xl"
              style={{ background: "var(--cream)", border: "1.5px solid var(--border)", boxShadow: "0 1px 10px rgba(26,22,18,0.05)" }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                style={{ background: "var(--teal)", color: "var(--cream)", fontFamily: "var(--font-dm-sans)" }}
              >
                {initials}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className="text-base font-semibold truncate" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
                  {profile?.name ?? "—"}
                </p>
                <p className="text-sm truncate" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                  {profile?.email ?? "—"}
                </p>
              </div>
            </div>

            {/* Travel preferences */}
            <div
              className="flex flex-col gap-0.5 p-5 rounded-2xl"
              style={{ background: "var(--cream)", border: "1.5px solid var(--border)", boxShadow: "0 1px 10px rgba(26,22,18,0.05)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                  Travel Preferences
                </p>
                <Link
                  href="/onboarding"
                  className="text-xs font-medium"
                  style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
                >
                  Update →
                </Link>
              </div>

              {prefs ? (
                <div className="flex flex-col gap-0">
                  <PrefRow label="Style" value={STYLE_LABELS[prefs.travel_style ?? ""] ?? prefs.travel_style ?? "—"} />
                  <PrefRow label="Budget" value={prefs.budget_max ? `$${prefs.budget_max.toLocaleString()} / person` : "—"} />
                  <PrefRow label="Trip length" value={LENGTH_LABELS[prefs.trip_length ?? ""] ?? prefs.trip_length ?? "—"} />
                  <PrefRow label="Flights" value={FLIGHT_LABELS[prefs.flight_preference ?? ""] ?? prefs.flight_preference ?? "—"} />
                  <PrefRow label="Hotel" value={HOTEL_LABELS[prefs.hotel_preference ?? ""] ?? prefs.hotel_preference ?? "—"} />
                  <PrefRow label="Flying from" value={prefs.departure_city ?? "—"} last />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                    No preferences saved yet.
                  </p>
                  <Link
                    href="/onboarding"
                    className="self-start px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: "var(--teal)",
                      color: "var(--cream)",
                      fontFamily: "var(--font-dm-sans)",
                      boxShadow: "0 2px 10px rgba(46,125,107,0.24)",
                    }}
                  >
                    Set preferences
                  </Link>
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "var(--cream)",
                color: "var(--rose)",
                border: "1.5px solid rgba(196,105,90,0.25)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Sign out
            </button>

            {/* Version */}
            <p
              className="text-center text-xs"
              style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
            >
              Safer v0.1 · سفر
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function PrefRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
        {label}
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
        {value}
      </span>
    </div>
  );
}
