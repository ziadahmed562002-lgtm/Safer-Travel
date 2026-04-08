"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  email: string;
  completed: boolean;
};

type Trip = {
  id: string;
  name: string;
  invite_code: string;
  start_date: string | null;
  end_date: string | null;
};

// Supabase returns unknown shape for complex selects
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export default function PreferencesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    async function load() {
      // Identify the current user first so we can redirect if they haven't
      // completed their own preferences for this trip.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const currentUserId = session.user.id;

      // Load trip
      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      if (tripData) setTrip(tripData);

      // Load members with profiles
      const { data: membersData } = await supabase
        .from("trip_members")
        .select("user_id, profiles(id, name, email)")
        .eq("trip_id", id);

      // Load which members have completed preferences for this trip
      const { data: prefsData } = await supabase
        .from("user_preferences")
        .select("user_id")
        .eq("trip_id", id)
        .not("completed_at", "is", null);

      if (membersData) {
        const completedIds = new Set((prefsData ?? []).map((p) => p.user_id));

        // If the current user is a member of this trip but hasn't completed
        // their preferences, send them straight to onboarding for this trip.
        const isMember = (membersData as { user_id: string }[]).some(
          (m) => m.user_id === currentUserId
        );
        if (isMember && !completedIds.has(currentUserId)) {
          router.replace(`/onboarding?trip=${id}`);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (membersData as any[]).map((m) => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return {
            id: m.user_id as string,
            name: (profile?.name as string) ?? "Member",
            email: (profile?.email as string) ?? "",
            completed: completedIds.has(m.user_id as string),
          };
        });
        setMembers(mapped);
      }

      setLoading(false);
    }

    load();

    // Real-time subscription
    const channel = supabase
      .channel(`trip-prefs-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_preferences", filter: `trip_id=eq.${id}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${trip?.invite_code}`
    : "";

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function generateMatches() {
    setGenerating(true);
    setGenerateError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    try {
      const res = await fetch(`/api/trips/${id}/match`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setGenerateError(json.error ?? "Something went wrong");
        setGenerating(false);
        return;
      }
      router.push(`/trips/${id}/results`);
    } catch {
      setGenerateError("Network error — please try again");
      setGenerating(false);
    }
  }

  const completedCount = members.filter((m) => m.completed).length;
  const totalCount = members.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  if (loading) {
    return (
      <main
        className="flex items-center justify-center min-h-dvh"
        style={{ background: "var(--sand)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Loading trip…
          </p>
        </div>
      </main>
    );
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
          backgroundImage: `radial-gradient(ellipse at 20% 80%, rgba(46,125,107,0.06) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-8">
        {/* Back */}
        <Link
          href="/"
          className="self-start flex items-center gap-1.5 text-sm"
          style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Home
        </Link>

        {/* Trip header */}
        <div className="flex flex-col gap-1">
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}
          >
            Your trip
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            {trip?.name ?? "Trip"}
          </h1>
          {trip?.start_date && (
            <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              {formatDate(trip.start_date)}
              {trip.end_date ? ` — ${formatDate(trip.end_date)}` : ""}
            </p>
          )}
        </div>

        {/* Progress card */}
        <div
          className="p-6 rounded-3xl flex flex-col gap-5"
          style={{
            background: "var(--cream)",
            border: "1.5px solid var(--border)",
            boxShadow: "0 2px 24px rgba(26,22,18,0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
              >
                Group preferences
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                {completedCount} of {totalCount} completed
              </p>
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: allDone ? "rgba(46,125,107,0.12)" : "rgba(200,150,62,0.12)",
                color: allDone ? "var(--teal)" : "var(--gold)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {allDone ? "All done ✓" : "In progress"}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: totalCount ? `${(completedCount / totalCount) * 100}%` : "0%",
                background: allDone ? "var(--teal)" : "var(--gold)",
              }}
            />
          </div>

          {/* Member list */}
          <div className="flex flex-col gap-2">
            {members.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                No members yet — share the invite link below
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-2"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: member.completed ? "rgba(46,125,107,0.15)" : "var(--sand)",
                      color: member.completed ? "var(--teal)" : "var(--ink-muted)",
                      border: "1.5px solid",
                      borderColor: member.completed ? "var(--teal)" : "var(--border)",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {(member.name || "?")[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
                    >
                      {member.name}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
                    >
                      {member.email}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: member.completed ? "rgba(46,125,107,0.1)" : "rgba(176,168,158,0.15)",
                      color: member.completed ? "var(--teal)" : "var(--ink-faint)",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {member.completed ? "Done" : "Pending"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite link */}
        <div className="flex flex-col gap-3">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
          >
            Invite your group
          </p>
          <div
            className="flex items-center gap-2 p-3 rounded-2xl"
            style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
          >
            <p
              className="flex-1 text-sm truncate"
              style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
            >
              {inviteUrl || `…/join?code=${trip?.invite_code}`}
            </p>
            <button
              onClick={copyInvite}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.96]"
              style={{
                background: copied ? "rgba(46,125,107,0.12)" : "var(--sand)",
                color: copied ? "var(--teal)" : "var(--ink-muted)",
                fontFamily: "var(--font-dm-sans)",
                border: "1px solid var(--border)",
              }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            Code: <span className="font-mono font-bold" style={{ color: "var(--gold)" }}>{trip?.invite_code}</span>
          </p>
        </div>

        {/* CTA when all done */}
        {allDone && (
          <div
            className="p-5 rounded-3xl flex flex-col gap-3"
            style={{
              background: "rgba(46,125,107,0.08)",
              border: "1.5px solid rgba(46,125,107,0.2)",
            }}
          >
            <p
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--teal)" }}
            >
              Everyone's in — time to plan!
            </p>
            <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              All preferences are collected. Safer will now find the destinations your whole group agrees on.
            </p>

            {generateError && (
              <p
                className="text-xs px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(196,105,90,0.1)",
                  color: "var(--rose)",
                  fontFamily: "var(--font-dm-sans)",
                  border: "1px solid rgba(196,105,90,0.2)",
                }}
              >
                {generateError}
              </p>
            )}

            <button
              onClick={generateMatches}
              disabled={generating}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-70"
              style={{
                background: generating ? "rgba(46,125,107,0.5)" : "var(--teal)",
                color: "var(--cream)",
                fontFamily: "var(--font-dm-sans)",
                boxShadow: generating ? "none" : "0 4px 16px rgba(46,125,107,0.24)",
              }}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 animate-spin inline-block"
                    style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }}
                  />
                  Finding the perfect destinations…
                </span>
              ) : (
                "Generate trip options ✨"
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
