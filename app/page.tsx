"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Scroll reveal wrapper                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
function RevealSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  FAQ accordion item                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center justify-between py-5 gap-4"
        style={{ fontFamily: "var(--font-dm-sans)", color: "var(--cream)", background: "none", border: "none", cursor: "pointer" }}
      >
        <span className="font-medium text-base leading-snug">{q}</span>
        <span style={{ color: "var(--gold)", flexShrink: 0, fontSize: "1.5rem", lineHeight: 1 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p
          className="pb-5 text-sm leading-relaxed"
          style={{ color: "rgba(176,168,158,0.85)", fontFamily: "var(--font-dm-sans)" }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */
const destinations = [
  { name: "Dubai", country: "UAE", tags: ["Luxury", "Desert"], gradient: "linear-gradient(145deg, #C8963E 0%, #B85C1A 100%)" },
  { name: "Istanbul", country: "Turkey", tags: ["Culture", "History"], gradient: "linear-gradient(145deg, #2E7D6B 0%, #1A4D40 100%)" },
  { name: "Marrakech", country: "Morocco", tags: ["Souks", "Riads"], gradient: "linear-gradient(145deg, #C4695A 0%, #8B3A2A 100%)" },
  { name: "Bali", country: "Indonesia", tags: ["Nature", "Temples"], gradient: "linear-gradient(145deg, #4A9E85 0%, #2E7D6B 100%)" },
  { name: "Egypt", country: "Egypt", tags: ["Ancient", "Wonders"], gradient: "linear-gradient(145deg, #C8963E 0%, #7A5010 100%)" },
  { name: "Maldives", country: "Maldives", tags: ["Beach", "Overwater"], gradient: "linear-gradient(145deg, #1A7A9A 0%, #2E7D6B 100%)" },
];

const steps = [
  {
    num: "01",
    title: "Everyone shares their preferences independently",
    desc: "Each traveller fills in their travel style, budget, and wishlist — no group chats, no compromises yet.",
    highlight: true,
  },
  {
    num: "02",
    title: "AI finds where your whole group agrees",
    desc: "Safer's matching engine analyses every combination and surfaces destinations that genuinely work for everyone.",
    highlight: false,
  },
  {
    num: "03",
    title: "See exactly why it works for everyone",
    desc: "Transparent AI explanations show how each destination scores against each person's preferences.",
    highlight: false,
  },
  {
    num: "04",
    title: "Book flights, hotels and experiences in one checkout",
    desc: "From the matched destination straight to booked — flights, hotels, and activities all in a single flow.",
    highlight: true,
    accent: true,
  },
];

const faqs = [
  {
    q: "How does the AI matching work?",
    a: "Safer collects preferences from every member of your group — travel style, budget, trip length, amenities — and runs them through a matching algorithm that finds destinations satisfying the most constraints across your whole group. You see a score breakdown for each destination so the group can make an informed decision.",
  },
  {
    q: "Can I use Safer for just flights, or just hotels?",
    a: "Yes. Once you have a destination, you can book just flights, just hotels, just experiences, or any combination. Each booking module is independent and you pay only for what you choose.",
  },
  {
    q: "Is it free to use?",
    a: "Creating a trip and gathering preferences is completely free. You only pay when you book flights, hotels, or experiences — and the price you see is the price you pay.",
  },
  {
    q: "How does Safer make money?",
    a: "Safer earns a small commission from airlines and hotels when you book through the platform, similar to how other travel aggregators work. This never inflates the price you see — we're committed to price transparency.",
  },
  {
    q: "What if my group can't agree on dates?",
    a: "Date flexibility is part of the preference gathering process. You can set a date range rather than fixed dates, and Safer will surface destinations and flights that work across the windows your group has indicated.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/trips");
    });
  }, [router]);

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-14px) rotate(-3deg); }
        }
      `}</style>

      <main style={{ background: "var(--sand)" }} className="overflow-x-hidden">

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section
          className="relative flex flex-col items-center justify-center min-h-dvh px-6 pt-20 pb-16 text-center overflow-hidden"
          style={{
            background: "linear-gradient(-45deg, #F5F0E8, #EFF0E8, #E8F2EE, #F2EDE3)",
            backgroundSize: "400% 400%",
            animation: "gradientShift 14s ease infinite",
          }}
        >
          {/* Ambient blobs */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div style={{ position: "absolute", top: "8%", left: "-25%", width: "65vw", height: "65vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(46,125,107,0.13) 0%, transparent 65%)" }} />
            <div style={{ position: "absolute", bottom: "8%", right: "-20%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,150,62,0.10) 0%, transparent 65%)" }} />
            <div style={{ position: "absolute", top: "40%", right: "5%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(184,92,26,0.06) 0%, transparent 65%)" }} />
          </div>

          {/* Logo */}
          <div className="relative flex flex-col items-center gap-2 mb-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--teal)", boxShadow: "0 8px 28px rgba(46,125,107,0.30)" }}
            >
              <span style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)", fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>س</span>
            </div>
            <span style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Safer</span>
          </div>

          {/* Headline */}
          <h1
            className="relative font-bold leading-tight max-w-xs mb-4"
            style={{
              fontFamily: "var(--font-playfair)",
              color: "var(--ink)",
              fontSize: "clamp(2rem, 8vw, 3rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            Plan a trip your whole group agrees on.
          </h1>

          {/* Subheadline */}
          <p
            className="relative leading-relaxed max-w-xs mb-10"
            style={{ fontFamily: "var(--font-dm-sans)", color: "var(--ink-muted)", fontSize: "1rem" }}
          >
            Safer uses AI to find the perfect destination for everyone — then books flights, hotels, and experiences in one place.
          </p>

          {/* CTAs */}
          <div className="relative flex flex-col gap-3 w-full max-w-xs mb-16">
            <Link
              href="/trips/new"
              className="w-full flex items-center justify-center py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "var(--burnt-orange)",
                color: "var(--cream)",
                fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 4px 24px rgba(184,92,26,0.35)",
                textDecoration: "none",
              }}
            >
              Start a Trip Free
            </Link>
            <button
              onClick={scrollToHow}
              className="w-full flex items-center justify-center py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-dm-sans)",
                border: "1.5px solid var(--border)",
                cursor: "pointer",
              }}
            >
              See how it works
            </button>
          </div>

          {/* Floating phone mockup */}
          <div className="relative" style={{ animation: "floatPhone 5.5s ease-in-out infinite" }}>
            <div
              style={{
                width: 210,
                height: 380,
                borderRadius: 36,
                background: "#161210",
                boxShadow: "0 40px 80px rgba(26,22,18,0.32), 0 8px 24px rgba(26,22,18,0.18), inset 0 0 0 1px rgba(255,255,255,0.07)",
                overflow: "hidden",
                padding: "10px 8px 8px",
                position: "relative",
              }}
            >
              {/* Dynamic island */}
              <div style={{ width: 72, height: 20, background: "#0D0B09", borderRadius: 12, margin: "0 auto 8px", border: "1.5px solid rgba(255,255,255,0.05)" }} />
              {/* Screen content */}
              <div
                style={{
                  background: "var(--sand)",
                  borderRadius: 28,
                  height: "calc(100% - 28px)",
                  overflow: "hidden",
                  padding: "14px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                <p style={{ fontSize: 8, fontWeight: 700, color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Your Matches</p>
                {[
                  { name: "Dubai", score: 94, sub: "UAE", gradient: "linear-gradient(135deg, #C8963E, #B85C1A)" },
                  { name: "Istanbul", score: 89, sub: "Turkey", gradient: "linear-gradient(135deg, #2E7D6B, #1A4D40)" },
                  { name: "Bali", score: 82, sub: "Indonesia", gradient: "linear-gradient(135deg, #4A9E85, #2E7D6B)" },
                ].map((dest) => (
                  <div
                    key={dest.name}
                    style={{
                      background: dest.gradient,
                      borderRadius: 14,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif", lineHeight: 1.2 }}>{dest.name}</p>
                      <p style={{ fontSize: 7.5, color: "rgba(255,255,255,0.65)", fontFamily: "sans-serif" }}>{dest.sub}</p>
                    </div>
                    <span style={{ fontSize: 8, color: "#fff", background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 6px", fontWeight: 700 }}>{dest.score}%</span>
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ background: "var(--burnt-orange)", borderRadius: 12, padding: "9px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: "var(--font-dm-sans)" }}>Book Dubai →</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF TICKER ───────────────────────────────────────────── */}
        <section style={{ background: "var(--teal)", overflow: "hidden", paddingTop: 16, paddingBottom: 12 }}>
          <div style={{ display: "flex", width: "max-content", animation: "ticker 24s linear infinite" }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {["Dubai", "Istanbul", "Marrakech", "Bali", "Egypt", "Maldives", "Tokyo", "Santorini", "Cape Town", "Lisbon", "Kyoto", "Amalfi"].map((d) => (
                  <span
                    key={d}
                    style={{
                      color: "rgba(253,250,245,0.9)",
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      letterSpacing: "0.07em",
                      padding: "0 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d}
                    <span style={{ color: "rgba(200,150,62,0.55)", fontSize: "0.45rem" }}>✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p
            className="text-center text-xs mt-2 px-4"
            style={{ color: "rgba(253,250,245,0.5)", fontFamily: "var(--font-dm-sans)", letterSpacing: "0.03em" }}
          >
            Join families planning trips to these destinations and more
          </p>
        </section>

        {/* ── PROBLEM SECTION ──────────────────────────────────────────────── */}
        <section style={{ background: "var(--ink)", padding: "88px 24px" }}>
          <div className="max-w-md mx-auto">
            <RevealSection>
              <h2
                className="text-center mb-3"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--cream)",
                  fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Group travel planning
                <br />
                <em>is broken.</em>
              </h2>
              <p className="text-center text-sm mb-12" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)", lineHeight: 1.7 }}>
                You spend weeks planning and still land somewhere half the group doesn&rsquo;t want to go.
              </p>
            </RevealSection>

            <div className="flex flex-col gap-4">
              {[
                { icon: "⏱", stat: "40 hours", desc: "of research before you even book anything" },
                { icon: "💬", stat: "Nobody can agree", desc: "on where to go, when, or what budget" },
                { icon: "🗂", stat: "5 different sites", desc: "to book flights, hotels, and experiences" },
              ].map((item, i) => (
                <RevealSection key={item.stat} delay={i * 110}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.035)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 20,
                      padding: "22px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <span style={{ fontSize: "1.6rem", flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                    <div>
                      <p style={{ color: "var(--gold)", fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 3, lineHeight: 1.2 }}>{item.stat}</p>
                      <p style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem", lineHeight: 1.55 }}>{item.desc}</p>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ padding: "88px 24px", background: "var(--sand)" }}>
          <div className="max-w-md mx-auto">
            <RevealSection>
              <p
                className="text-center mb-3"
                style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                How it works
              </p>
              <h2
                className="text-center mb-16"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--ink)",
                  fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                From group chat chaos<br />to booked trip.
              </h2>
            </RevealSection>

            <div className="flex flex-col">
              {steps.map((step, i) => (
                <RevealSection key={step.num} delay={i * 100}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {/* Step badge */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: step.accent
                          ? "var(--burnt-orange)"
                          : step.highlight
                          ? "var(--teal)"
                          : "var(--cream)",
                        border: step.highlight || step.accent ? "none" : "1.5px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: step.accent
                          ? "0 4px 16px rgba(184,92,26,0.22)"
                          : step.highlight
                          ? "0 4px 16px rgba(46,125,107,0.22)"
                          : "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-playfair)",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: step.highlight || step.accent ? "var(--cream)" : "var(--ink-muted)",
                        }}
                      >
                        {step.num}
                      </span>
                    </div>
                    {/* Step content */}
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <h3 style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)", fontWeight: 700, fontSize: "1rem", marginBottom: 6, lineHeight: 1.35 }}>{step.title}</h3>
                      <p style={{ fontFamily: "var(--font-dm-sans)", color: "var(--ink-muted)", fontSize: "0.85rem", lineHeight: 1.65 }}>{step.desc}</p>
                    </div>
                  </div>
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div style={{ width: 1, height: 28, background: "var(--border)", marginLeft: 21, marginTop: 10, marginBottom: 10 }} />
                  )}
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────────── */}
        <section style={{ padding: "88px 24px", background: "var(--cream)" }}>
          <div className="max-w-md mx-auto">
            <RevealSection>
              <p
                className="text-center mb-3"
                style={{ color: "var(--burnt-orange)", fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                Why Safer
              </p>
              <h2
                className="text-center mb-14"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--ink)",
                  fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Built for groups.<br />Designed for peace.
              </h2>
            </RevealSection>

            <div className="flex flex-col gap-5">
              {[
                {
                  icon: "✦",
                  title: "AI Group Matching",
                  desc: "Our algorithm doesn't just average preferences — it finds destinations that genuinely satisfy every person's must-haves.",
                  accent: "var(--teal)",
                  shadow: "rgba(46,125,107,0.22)",
                },
                {
                  icon: "◎",
                  title: "Transparent AI",
                  desc: "See exactly why the AI picked your destination. A breakdown by traveller, by criteria — no black box, no guesswork.",
                  accent: "var(--gold)",
                  shadow: "rgba(200,150,62,0.22)",
                },
                {
                  icon: "→",
                  title: "One Checkout",
                  desc: "Flights, hotels, and experiences booked in a single flow. One confirmation, one receipt, zero coordination hell.",
                  accent: "var(--burnt-orange)",
                  shadow: "rgba(184,92,26,0.22)",
                },
              ].map((feat, i) => (
                <RevealSection key={feat.title} delay={i * 100}>
                  <div
                    style={{
                      background: "var(--sand)",
                      borderRadius: 22,
                      padding: "24px 20px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: feat.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                        color: "var(--cream)",
                        fontSize: "1rem",
                        fontWeight: 700,
                        boxShadow: `0 4px 14px ${feat.shadow}`,
                      }}
                    >
                      {feat.icon}
                    </div>
                    <h3 style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>{feat.title}</h3>
                    <p style={{ fontFamily: "var(--font-dm-sans)", color: "var(--ink-muted)", fontSize: "0.875rem", lineHeight: 1.7 }}>{feat.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── DESTINATIONS ─────────────────────────────────────────────────── */}
        <section style={{ padding: "88px 24px", background: "var(--sand)" }}>
          <div className="max-w-md mx-auto">
            <RevealSection>
              <p
                className="text-center mb-3"
                style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                Destinations
              </p>
              <h2
                className="text-center mb-12"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--ink)",
                  fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Where will your group go?
              </h2>
            </RevealSection>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {destinations.map((dest, i) => (
                <RevealSection key={dest.name} delay={i * 55}>
                  <DestinationCard dest={dest} />
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section style={{ padding: "88px 24px", background: "var(--ink)" }}>
          <div className="max-w-md mx-auto">
            <RevealSection>
              <p
                className="text-center mb-3"
                style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                FAQ
              </p>
              <h2
                className="text-center mb-12"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--cream)",
                  fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Questions answered.
              </h2>
            </RevealSection>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {faqs.map((faq, i) => (
                <RevealSection key={faq.q} delay={i * 60}>
                  <FAQItem q={faq.q} a={faq.a} />
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
        <section
          style={{
            padding: "100px 24px",
            background: "linear-gradient(160deg, var(--sand) 0%, #EAE3D2 100%)",
            textAlign: "center",
          }}
        >
          <div className="max-w-sm mx-auto">
            <RevealSection>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "var(--teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 28px",
                  boxShadow: "0 8px 28px rgba(46,125,107,0.28)",
                }}
              >
                <span style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)", fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>س</span>
              </div>
              <h2
                className="mb-4"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--ink)",
                  fontSize: "clamp(1.75rem, 7vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Ready to plan your next trip?
              </h2>
              <p className="mb-8 text-base" style={{ fontFamily: "var(--font-dm-sans)", color: "var(--ink-muted)", lineHeight: 1.65 }}>
                Invite your group, share preferences, and let Safer do the rest.
              </p>
              <Link
                href="/trips/new"
                className="flex items-center justify-center py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97] w-full mb-3"
                style={{
                  background: "var(--burnt-orange)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 4px 24px rgba(184,92,26,0.35)",
                  textDecoration: "none",
                }}
              >
                Start a Trip Free
              </Link>
              <p style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem" }}>No credit card required</p>
            </RevealSection>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ background: "var(--ink)", padding: "36px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-playfair)", color: "var(--cream)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 4 }}>
            Safer{" "}
            <span style={{ color: "var(--gold)", fontStyle: "normal" }}>سفر</span>
          </p>
          <p className="text-xs mb-6" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>Group travel, beautifully coordinated.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 28 }}>
            {[
              { label: "Sign in", href: "/login" },
              { label: "Sign up", href: "/signup" },
              { label: "Join a trip", href: "/join" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", textDecoration: "none" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </footer>
      </main>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Destination card — separate component to use local state for hover          */
/* ─────────────────────────────────────────────────────────────────────────── */
function DestinationCard({
  dest,
}: {
  dest: { name: string; country: string; tags: string[]; gradient: string };
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: dest.gradient,
        borderRadius: 22,
        minHeight: 148,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transform: hovered ? "scale(1.035)" : "scale(1)",
        boxShadow: hovered ? "0 14px 36px rgba(26,22,18,0.2)" : "0 2px 8px rgba(26,22,18,0.08)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
      }}
    >
      {/* Bottom fade */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.30) 100%)" }}
      />
      {/* Text */}
      <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
        <p style={{ color: "#fff", fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "0.95rem", marginBottom: 1, lineHeight: 1.2 }}>{dest.name}</p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", marginBottom: 6 }}>{dest.country}</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {dest.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                borderRadius: 7,
                padding: "2px 7px",
                fontSize: "0.62rem",
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 500,
                backdropFilter: "blur(4px)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
