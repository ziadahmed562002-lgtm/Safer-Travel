"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  organizer_id: string;
  selected_destination: { name: string; country: string } | null;
  member_count: number;
  is_organizer: boolean;
};

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function continueHref(trip: Trip) {
  if (trip.selected_destination) return `/trips/${trip.id}/plan`;
  return `/trips/${trip.id}/preferences`;
}

function StatusBadge({ hasDestination }: { hasDestination: boolean }) {
  if (hasDestination) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{
          background: "rgba(46,125,107,0.10)",
          color: "var(--teal)",
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--teal)" }} />
        Planning
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: "rgba(200,150,62,0.10)",
        color: "var(--gold)",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--gold)" }} />
      Gathering prefs
    </span>
  );
}

function TripCard({
  trip,
  onDelete,
  onRename,
}: {
  trip: Trip;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(trip.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraftName(trip.name);
    setEditing(true);
    // Focus after paint
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftName(trip.name);
  }

  async function commitRename() {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === trip.name) {
      cancelEdit();
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("trips")
      .update({ name: trimmed })
      .eq("id", trip.id);
    setSaving(false);
    if (!error) {
      onRename(trimmed);
      setEditing(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    await supabase.from("trips").delete().eq("id", trip.id);
    onDelete();
  }

  // Confirmation view replaces card body
  if (confirming) {
    return (
      <div
        className="flex flex-col gap-4 p-5 rounded-3xl"
        style={{
          background: "var(--cream)",
          border: "1.5px solid rgba(196,105,90,0.35)",
          boxShadow: "0 2px 16px rgba(26,22,18,0.05)",
        }}
      >
        <div className="flex flex-col gap-1">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
          >
            Delete &ldquo;{trip.name}&rdquo;?
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
          >
            This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "var(--sand)",
              color: "var(--ink-muted)",
              fontFamily: "var(--font-dm-sans)",
              border: "1.5px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "var(--rose)",
              color: "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-3xl transition-all"
      style={{
        background: "var(--cream)",
        border: "1.5px solid var(--border)",
        boxShadow: "0 2px 16px rgba(26,22,18,0.05)",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="flex-1 min-w-0 px-2 py-1 rounded-lg text-base font-semibold outline-none"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--ink)",
                  background: "var(--sand)",
                  border: "1.5px solid var(--teal)",
                }}
                autoFocus
              />
              <button
                onClick={commitRename}
                disabled={saving || !draftName.trim()}
                aria-label="Save name"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-[0.95] disabled:opacity-40"
                style={{ background: "var(--teal)", color: "var(--cream)" }}
              >
                {saving ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
              <button
                onClick={cancelEdit}
                aria-label="Cancel"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-[0.95]"
                style={{ background: "var(--sand)", color: "var(--ink-muted)", border: "1.5px solid var(--border)" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="text-left"
              title="Tap to rename"
            >
              <h2
                className="text-base font-semibold leading-tight truncate hover:underline decoration-dotted underline-offset-2"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
              >
                {trip.name}
              </h2>
            </button>
          )}
          {trip.selected_destination && (
            <p
              className="text-sm truncate"
              style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
            >
              {trip.selected_destination.name}
              {trip.selected_destination.country ? `, ${trip.selected_destination.country}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge hasDestination={!!trip.selected_destination} />
          {trip.is_organizer && (
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete trip"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-[0.95]"
              style={{ color: "var(--ink-faint)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--rose)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4">
        {dateRange && (
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-faint)" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              {dateRange}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-faint)" }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            {trip.member_count} {trip.member_count === 1 ? "member" : "members"}
          </span>
        </div>
        {trip.is_organizer && (
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            Organizer
          </span>
        )}
      </div>

      {/* Continue button */}
      <Link
        href={continueHref(trip)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          background: "var(--burnt-orange)",
          color: "var(--cream)",
          fontFamily: "var(--font-dm-sans)",
          boxShadow: "0 3px 12px rgba(184,92,26,0.22)",
        }}
      >
        Continue
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// Landing CTAs shown when user has no trips
function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center gap-8 max-w-sm w-full mx-auto">
      <div className="flex flex-col gap-2">
        <p
          className="text-xl leading-snug font-medium"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
        >
          No trips yet.
        </p>
        <p
          className="text-base leading-snug"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--ink-muted)", fontStyle: "italic" }}
        >
          Start one or join a friend&apos;s.
        </p>
      </div>

      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} />
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Link
          href="/trips/new"
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98]"
          style={{
            background: "var(--burnt-orange)",
            color: "var(--cream)",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 4px 20px rgba(184,92,26,0.28)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Start a Trip
        </Link>

        <Link
          href="/join"
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98]"
          style={{
            background: "var(--cream)",
            color: "var(--ink)",
            fontFamily: "var(--font-dm-sans)",
            border: "1.5px solid var(--border)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Join a Trip
        </Link>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;
      setUserId(uid);

      const { data: memberRows } = await supabase
        .from("trip_members")
        .select("trip_id, role")
        .eq("user_id", uid);

      if (!memberRows || memberRows.length === 0) {
        setTrips([]);
        setLoading(false);
        return;
      }

      const tripIds = memberRows.map((r) => r.trip_id);
      const roleMap = Object.fromEntries(memberRows.map((r) => [r.trip_id, r.role]));

      const { data: tripRows } = await supabase
        .from("trips")
        .select("id, name, start_date, end_date, organizer_id, selected_destination")
        .in("id", tripIds)
        .order("created_at", { ascending: false });

      const { data: allMembers } = await supabase
        .from("trip_members")
        .select("trip_id")
        .in("trip_id", tripIds);

      const countMap: Record<string, number> = {};
      for (const row of allMembers ?? []) {
        countMap[row.trip_id] = (countMap[row.trip_id] ?? 0) + 1;
      }

      const mapped: Trip[] = (tripRows ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        organizer_id: t.organizer_id,
        selected_destination: t.selected_destination ?? null,
        member_count: countMap[t.id] ?? 1,
        is_organizer: t.organizer_id === uid || roleMap[t.id] === "organizer",
      }));

      setTrips(mapped);
      setLoading(false);
    }

    load();
  }, [router]);

  function handleDelete(id: string) {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  function handleRename(id: string, name: string) {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  return (
    <main
      className="relative flex flex-col min-h-dvh px-6 py-12"
      style={{ background: "var(--sand)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 15% 85%, rgba(46,125,107,0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, rgba(200,150,62,0.07) 0%, transparent 55%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--teal)" }}
            >
              <span
                className="text-base font-bold"
                style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
              >
                س
              </span>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
            >
              My Trips
            </h1>
          </div>

          {!loading && (
            <Link
              href="/trips/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "var(--burnt-orange)",
                color: "var(--cream)",
                fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 3px 12px rgba(184,92,26,0.22)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Trip
            </Link>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-36 rounded-3xl animate-pulse"
                style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
              />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onDelete={() => handleDelete(trip.id)}
                onRename={(name) => handleRename(trip.id, name)}
              />
            ))}

            <Link
              href="/join"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "var(--cream)",
                color: "var(--ink-muted)",
                fontFamily: "var(--font-dm-sans)",
                border: "1.5px solid var(--border)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Join another trip
            </Link>
          </div>
        )}

        {/* Sign out */}
        {!loading && userId && (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/");
            }}
            className="self-center text-xs underline underline-offset-2"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
          >
            Sign out
          </button>
        )}
      </div>
    </main>
  );
}
