"use client";

import { useEffect, useState, useMemo, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Recommendation = {
  title: string;
  description: string;
  price: number | null;
  currency: string;
  duration: string;
  photoURL: string | null;
  productCode: string;
  webURL: string;
};

type SavedState = "idle" | "saving" | "saved" | "error";

type BookingNeeds = {
  flights: boolean;
  accommodation: boolean;
  experiences: boolean;
};

export default function ExperiencesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedStates, setSavedStates] = useState<Record<number, SavedState>>({});
  const [bookingNeeds, setBookingNeeds] = useState<BookingNeeds | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Load booking_needs and enforce module guard
      const { data: tripData } = await supabase
        .from("trips")
        .select("booking_needs")
        .eq("id", id)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const needs: BookingNeeds | null = (tripData as any)?.booking_needs ?? null;
      if (needs && needs.experiences === false) {
        router.push(`/trips/${id}/plan`);
        return;
      }
      setBookingNeeds(needs);

      try {
        const res = await fetch(`/api/trips/${id}/experiences`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not load experiences");
        } else {
          setDestination(json.destination ?? "");
          setRecommendations(json.recommendations ?? []);
        }
      } catch {
        setError("Network error — please try again");
      }

      setLoading(false);
    }

    load();
  }, [id, router]);

  async function handleSave(rec: Recommendation, index: number) {
    setSavedStates((s) => ({ ...s, [index]: "saving" }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavedStates((s) => ({ ...s, [index]: "error" }));
      return;
    }

    const estCost = rec.price != null
      ? `From $${rec.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : "";

    const { error: saveError } = await supabase.from("trip_experiences").insert({
      trip_id: id,
      user_id: user.id,
      title: rec.title,
      description: rec.description,
      est_cost: estCost,
      duration: rec.duration,
      product_code: rec.productCode,
      web_url: rec.webURL,
      photo_url: rec.photoURL,
    });

    setSavedStates((s) => ({ ...s, [index]: saveError ? "error" : "saved" }));
  }

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    Adventure: ["hike", "hiking", "climb", "surf", "dive", "diving", "quad", "safari", "kayak", "zip", "rafting", "desert", "dune", "bungee"],
    Food: ["food", "culinary", "cooking", "dinner", "lunch", "tasting", "wine", "beer", "market", "tour food", "street food", "gastro"],
    Culture: ["museum", "history", "historic", "temple", "mosque", "palace", "heritage", "art", "architecture", "tour", "guided"],
    Water: ["boat", "cruise", "sail", "snorkel", "swim", "beach", "island", "lagoon", "sea", "ocean", "river"],
  };

  function getCategory(title: string): string {
    const lower = title.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => lower.includes(k))) return cat;
    }
    return "Culture";
  }

  const categories = useMemo(() => {
    if (!recommendations.length) return [];
    const cats = new Set(recommendations.map((r) => getCategory(r.title)));
    return ["All", ...Array.from(cats)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations]);

  const filtered = useMemo(() =>
    activeCategory === "All"
      ? recommendations
      : recommendations.filter((r) => getCategory(r.title) === activeCategory),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [recommendations, activeCategory]);

  return (
    <main className="page-enter relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 75% 15%, rgba(46,125,107,0.07) 0%, transparent 50%),
            radial-gradient(ellipse at 15% 85%, rgba(200,150,62,0.05) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
        {/* Back */}
        <Link
          href={
            bookingNeeds?.accommodation
              ? `/trips/${id}/hotels`
              : bookingNeeds?.flights
              ? `/trips/${id}/flights`
              : `/trips/${id}/plan`
          }
          className="self-start flex items-center gap-1.5 text-sm"
          style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {bookingNeeds?.accommodation
            ? "Back to hotels"
            : bookingNeeds?.flights
            ? "Back to flights"
            : "Back to plan"}
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
            Experiences
          </p>
          <h1 className="text-3xl font-bold leading-snug" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
            {destination ? (
              <>Top picks for <span style={{ color: "var(--teal)" }}>{destination}</span></>
            ) : (
              "Your experiences"
            )}
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Real experiences from Viator — save the ones you want, then book directly.
          </p>
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl mt-1"
            style={{ background: "rgba(200,150,62,0.07)", border: "1px solid rgba(200,150,62,0.2)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
              Save experiences to your itinerary — complete booking on Viator at checkout.
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} tripId={id} />
        ) : (
          <>
            {/* Category pills */}
            {categories.length > 2 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: activeCategory === cat ? "var(--teal)" : "var(--cream)",
                      color: activeCategory === cat ? "var(--cream)" : "var(--ink-muted)",
                      border: `1.5px solid ${activeCategory === cat ? "var(--teal)" : "var(--border)"}`,
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {filtered.map((rec, i) => (
                <ExperienceCard
                  key={rec.productCode || i}
                  rec={rec}
                  saveState={savedStates[recommendations.indexOf(rec)] ?? "idle"}
                  onSave={() => handleSave(rec, recommendations.indexOf(rec))}
                />
              ))}
            </div>

            {/* Bottom actions */}
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href={`/trips/${id}/checkout`}
                className="w-full py-4 rounded-xl text-sm font-semibold text-center transition-all active:scale-[0.98]"
                style={{
                  background: "var(--burnt-orange)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 4px 16px rgba(184,92,26,0.24)",
                }}
              >
                Continue to Checkout →
              </Link>
              <Link
                href={`/trips/${id}/checkout`}
                className="text-center text-sm"
                style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
              >
                Skip experiences
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ExperienceCard({
  rec,
  saveState,
  onSave,
}: {
  rec: Recommendation;
  saveState: SavedState;
  onSave: () => void;
}) {
  const saved = saveState === "saved";
  const saving = saveState === "saving";

  const formattedPrice = rec.price != null
    ? `From $${rec.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null;

  return (
    <div
      className="card-lift flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "var(--cream)",
        border: `1.5px solid ${saved ? "rgba(46,125,107,0.35)" : "var(--border)"}`,
        boxShadow: saved ? "0 1px 10px rgba(46,125,107,0.1)" : "0 1px 10px rgba(26,22,18,0.05)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Photo hero */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-200">
        {rec.photoURL ? (
          <Image
            src={rec.photoURL}
            alt={rec.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #2E7D6B 0%, #C8963E 100%)" }}
          />
        )}
        {/* Viator badge */}
        <div
          className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-xs font-semibold"
          style={{
            background: "rgba(0,0,0,0.55)",
            color: "rgba(255,255,255,0.9)",
            fontFamily: "var(--font-dm-sans)",
            backdropFilter: "blur(4px)",
          }}
        >
          Viator
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4">
        {/* Title + price/duration */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-semibold leading-snug" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
            {rec.title}
          </p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {formattedPrice && (
              <span className="text-xs font-semibold" style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}>
                {formattedPrice}
              </span>
            )}
            {rec.duration && (
              <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                {rec.duration}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {rec.description && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
          >
            {rec.description.length > 160 ? rec.description.slice(0, 157) + "…" : rec.description}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-1">
          {/* Book on Viator */}
          <a
            href={rec.webURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            style={{
              background: "var(--burnt-orange)",
              color: "#fff",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: "0 3px 12px rgba(184,92,26,0.22)",
            }}
          >
            Book on Viator
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          {/* Save to itinerary */}
          <button
            onClick={onSave}
            disabled={saved || saving}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-default flex items-center justify-center gap-1.5${saved ? " success-pop" : ""}`}
            style={{
              background: saved ? "rgba(46,125,107,0.12)" : saving ? "var(--border)" : "var(--sand)",
              color: saved ? "var(--teal)" : saving ? "var(--ink-faint)" : "var(--ink-muted)",
              border: `1.5px solid ${saved ? "rgba(46,125,107,0.3)" : "var(--border)"}`,
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {saved ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved ✓
              </>
            ) : saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 animate-spin inline-block" style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: "var(--ink-muted)" }} />
                Saving…
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-col items-center gap-3 py-8 px-5 rounded-2xl"
        style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
          Finding experiences on Viator…
        </p>
        <p className="text-xs text-center" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          Fetching top-rated activities for your destination.
        </p>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }} />
      ))}
    </div>
  );
}

function ErrorState({ message, tripId }: { message: string; tripId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="px-5 py-4 rounded-2xl"
        style={{ background: "rgba(196,105,90,0.08)", border: "1px solid rgba(196,105,90,0.2)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}>
          Could not load experiences
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          {message}
        </p>
      </div>
      <Link
        href={`/trips/${tripId}/checkout`}
        className="w-full py-4 rounded-xl text-sm font-semibold text-center transition-all active:scale-[0.98]"
        style={{
          background: "var(--burnt-orange)",
          color: "var(--cream)",
          fontFamily: "var(--font-dm-sans)",
          boxShadow: "0 4px 16px rgba(184,92,26,0.24)",
        }}
      >
        Continue to Checkout →
      </Link>
    </div>
  );
}
