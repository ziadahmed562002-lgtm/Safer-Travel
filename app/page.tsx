"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/trips");
    });
  }, [router]);

  return (
    <main
      className="relative flex flex-col items-center justify-between min-h-dvh px-6 py-12 overflow-hidden"
      style={{ background: "var(--sand)" }}
    >
      {/* Decorative gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 15% 85%, rgba(46,125,107,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, rgba(200,150,62,0.08) 0%, transparent 55%)`,
        }}
      />

      <div />

      {/* Center content */}
      <div className="relative flex flex-col items-center text-center gap-8 max-w-sm w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "var(--teal)" }}
          >
            <span
              className="text-3xl font-bold"
              style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
            >
              س
            </span>
          </div>
          <div>
            <h1
              className="text-4xl font-bold tracking-tight leading-none"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
            >
              Safer
            </h1>
            <p
              className="text-sm mt-1 tracking-widest"
              style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}
            >
              سفر
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-1">
          <p
            className="text-xl leading-snug font-medium"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            Plan a trip your whole group agrees on,
          </p>
          <p
            className="text-xl leading-snug"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink-muted)", fontStyle: "italic" }}
          >
            where everything just works.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} />
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* CTAs */}
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

        {/* Sign in */}
        <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--teal)" }}
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p
        className="text-xs tracking-wide"
        style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
      >
        Group travel, beautifully coordinated.
      </p>
    </main>
  );
}
