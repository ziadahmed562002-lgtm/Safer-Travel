"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TravelerProfile = {
  id: string;
  full_name: string;
  relationship: string;
  passport_expiry: string | null;
  nationality: string | null;
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: "Self",
  spouse: "Spouse / Partner",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  friend: "Friend",
  other: "Other",
};

function passportStatus(expiry: string | null): {
  dot: string;
  label: string;
} {
  if (!expiry) return { dot: "var(--ink-faint)", label: "No passport saved" };
  const today = new Date();
  const exp = new Date(expiry);
  const daysLeft = Math.floor((exp.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) return { dot: "var(--rose)", label: "Passport expired" };
  if (daysLeft <= 90) return { dot: "var(--gold)", label: `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` };
  return {
    dot: "var(--teal)",
    label: `Valid until ${exp.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
  };
}

export default function GroupPage() {
  const router = useRouter();
  const [travelers, setTravelers] = useState<TravelerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("traveler_profiles")
        .select("id, full_name, relationship, passport_expiry, nationality")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: true });

      setTravelers(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <main className="relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 80% 10%, rgba(200,150,62,0.07) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              My Travelers
            </h1>
            <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              Passport & preference profiles
            </p>
          </div>
          <Link
            href="/group/traveler/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "var(--burnt-orange)",
              color: "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: "0 3px 12px rgba(184,92,26,0.22)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }} />
            ))}
          </div>
        ) : travelers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {travelers.map((t) => (
              <TravelerCard key={t.id} traveler={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TravelerCard({ traveler }: { traveler: TravelerProfile }) {
  const { dot, label } = passportStatus(traveler.passport_expiry);
  const relLabel = RELATIONSHIP_LABELS[traveler.relationship] ?? traveler.relationship;
  const initials = traveler.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/group/traveler/${traveler.id}`}
      className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
      style={{
        background: "var(--cream)",
        border: "1.5px solid var(--border)",
        boxShadow: "0 1px 10px rgba(26,22,18,0.05)",
      }}
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-semibold text-sm"
        style={{ background: "rgba(46,125,107,0.12)", color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
          {traveler.full_name}
        </p>
        <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          {relLabel}
          {traveler.nationality ? ` · ${traveler.nationality}` : ""}
        </p>
        {/* Passport status */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: dot }} />
          <span className="text-xs" style={{ color: dot === "var(--ink-faint)" ? "var(--ink-faint)" : dot, fontFamily: "var(--font-dm-sans)" }}>
            {label}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-faint)", shrink: 0 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center text-center gap-5 p-8 rounded-3xl"
      style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(46,125,107,0.1)", border: "1.5px solid rgba(46,125,107,0.15)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          No travelers yet
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          Save your family{"'"}s details once, use them every trip.
        </p>
      </div>
      <Link
        href="/group/traveler/new"
        className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          background: "var(--burnt-orange)",
          color: "var(--cream)",
          fontFamily: "var(--font-dm-sans)",
          boxShadow: "0 3px 12px rgba(184,92,26,0.2)",
        }}
      >
        Add First Traveler
      </Link>
    </div>
  );
}
