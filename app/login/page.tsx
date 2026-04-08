"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/trips");
    }
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
          backgroundImage: `radial-gradient(ellipse at 20% 80%, rgba(46,125,107,0.06) 0%, transparent 55%)`,
        }}
      />

      <div className="relative w-full max-w-sm flex flex-col gap-8">
        {/* Back + Logo */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/"
            className="self-start flex items-center gap-1.5 text-sm mb-4"
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
            <span
              className="text-xl font-bold"
              style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
            >
              س
            </span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Sign in to your Safer account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] mt-2 disabled:opacity-60"
            style={{
              background: "var(--burnt-orange)",
              color: "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: "0 4px 16px rgba(184,92,26,0.24)",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--teal)" }}
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
