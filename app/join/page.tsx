"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/signup?then=/join?code=${code}`);
      return;
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("id, name")
      .eq("invite_code", code.trim().toUpperCase())
      .single();

    if (!trip) {
      setError("No trip found with that code. Double-check it with your organizer.");
      setLoading(false);
      return;
    }

    // Add member
    await supabase.from("trip_members").upsert({
      trip_id: trip.id,
      user_id: user.id,
    });

    router.push(`/onboarding?trip=${trip.id}`);
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
          backgroundImage: `radial-gradient(ellipse at 30% 70%, rgba(46,125,107,0.07) 0%, transparent 55%)`,
        }}
      />

      <div className="relative w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
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
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--teal)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            Join a trip
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Enter the invite code from your group organizer
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4 p-6 rounded-3xl"
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
              Invite code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              required
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl text-base font-mono text-center tracking-widest outline-none transition-all uppercase"
              style={{
                background: "var(--sand)",
                border: "1.5px solid var(--border)",
                color: "var(--ink)",
                fontFamily: "monospace",
                letterSpacing: "0.25em",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] mt-2 disabled:opacity-40"
            style={{
              background: loading || !code.trim() ? "var(--border)" : "var(--teal)",
              color: loading || !code.trim() ? "var(--ink-muted)" : "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: loading || !code.trim() ? "none" : "0 4px 16px rgba(46,125,107,0.24)",
            }}
          >
            {loading ? "Joining…" : "Join trip"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          Want to start your own?{" "}
          <Link
            href="/trips/new"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--burnt-orange)" }}
          >
            Create a trip
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
