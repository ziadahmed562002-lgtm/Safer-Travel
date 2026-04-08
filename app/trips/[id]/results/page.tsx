"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DestinationInline = {
  name: string;
  country: string;
  description: string;
  image_search_query: string;
  tags: string[];
};

type DestinationMatch = {
  destination_id: string | null;
  ai_score: number;
  match_explanation: string;
  personality_scores: Record<string, number>;
  compromise_notes: string;
  destination_inline: DestinationInline;
  // DB record — present only when destination_id matched a featured destination
  destination: {
    id: string;
    name: string;
    country: string;
    description: string;
    image_url: string;
    tags: string[];
  } | null;
};

type Trip = {
  id: string;
  name: string;
};

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [results, setResults] = useState<DestinationMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: tripData } = await supabase
        .from("trips")
        .select("id, name")
        .eq("id", id)
        .single();
      if (tripData) setTrip(tripData);

      const { data: shortlist, error: err } = await supabase
        .from("trip_shortlist")
        .select("*, destinations(*)")
        .eq("trip_id", id)
        .order("ai_score", { ascending: false });

      if (err) {
        console.error("[results] shortlist fetch error:", err.message, err.code, err.details);
        setError(err.message);
        setLoading(false);
        return;
      }

      console.log("[results] shortlist rows:", shortlist?.length ?? 0);
      if (!shortlist || shortlist.length === 0) {
        console.warn("[results] shortlist is empty — either insert failed or no rows for trip:", id);
      }

      if (shortlist && shortlist.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (shortlist as any[]).map((row) => {
          const inline = row.personality_scores?.destination_inline as DestinationInline | undefined;
          const dbDest = row.destinations ?? null;

          return {
            destination_id: row.destination_id as string | null,
            ai_score: Number(row.ai_score),
            match_explanation: row.match_explanation as string,
            personality_scores:
              (row.personality_scores?.member_scores as Record<string, number>) ?? {},
            compromise_notes: (row.personality_scores?.compromise_notes as string) ?? "",
            destination_inline: inline ?? {
              name: dbDest?.name ?? "Unknown destination",
              country: dbDest?.country ?? "",
              description: dbDest?.description ?? "",
              image_search_query: "",
              tags: dbDest?.tags ?? [],
            },
            destination: dbDest,
          } satisfies DestinationMatch;
        });
        setResults(mapped);
      }

      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <main
        className="flex items-center justify-center min-h-dvh"
        style={{ background: "var(--sand)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Loading results…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        className="flex flex-col items-center justify-center min-h-dvh px-6"
        style={{ background: "var(--sand)" }}
      >
        <p className="text-sm mb-4" style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </p>
        <button
          onClick={() => router.back()}
          className="text-sm underline"
          style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
        >
          Go back
        </button>
      </main>
    );
  }

  if (results.length === 0) {
    return (
      <main
        className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4"
        style={{ background: "var(--sand)" }}
      >
        <p className="text-base text-center" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          No results yet. Generate matches from the trip page.
        </p>
        <Link
          href={`/trips/${id}/preferences`}
          className="text-sm font-semibold underline"
          style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
        >
          Back to trip
        </Link>
      </main>
    );
  }

  return (
    <main
      className="relative flex flex-col min-h-dvh px-6 py-12"
      style={{ background: "var(--sand)" }}
    >
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 80% 10%, rgba(200,150,62,0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 10% 90%, rgba(46,125,107,0.05) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-8">
        {/* Back */}
        <Link
          href={`/trips/${id}/preferences`}
          className="self-start flex items-center gap-1.5 text-sm"
          style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to trip
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}
          >
            AI Matches
          </p>
          <h1
            className="text-3xl font-bold leading-snug"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            Top picks for{" "}
            <span style={{ color: "var(--teal)" }}>{trip?.name ?? "your group"}</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Ranked by how well they work for everyone.
          </p>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {results.map((match, index) => (
            <DestinationCard
              key={`${match.destination_id ?? match.destination_inline.name}-${index}`}
              match={match}
              rank={index + 1}
              tripId={id}
            />
          ))}
        </div>

        {/* Regenerate */}
        <Link
          href={`/trips/${id}/preferences`}
          className="text-center text-sm"
          style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
        >
          Not feeling these?{" "}
          <span className="font-semibold underline" style={{ color: "var(--teal)" }}>
            Go back and regenerate
          </span>
        </Link>
      </div>
    </main>
  );
}

function DestinationCard({ match, rank, tripId }: { match: DestinationMatch; rank: number; tripId: string }) {
  const router = useRouter();
  const { destination, destination_inline, ai_score, match_explanation, personality_scores, compromise_notes } = match;
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState("");

  async function handleSelect() {
    setSelecting(true);
    setSelectError("");

    const payload = {
      ...destination_inline,
      image_url: destination?.image_url ?? null,
      destination_id: match.destination_id ?? null,
    };

    const { error } = await supabase
      .from("trips")
      .update({ selected_destination: payload })
      .eq("id", tripId);

    if (error) {
      console.error("Failed to select destination:", error.message);
      setSelectError("Couldn't save selection — try again");
      setSelecting(false);
      return;
    }

    router.push(`/trips/${tripId}/plan`);
  }

  // Resolve display values: prefer DB record if available, fall back to inline
  const displayName = destination?.name ?? destination_inline.name;
  const displayCountry = destination?.country ?? destination_inline.country;
  const displayDescription = destination?.description ?? destination_inline.description;
  const displayTags = destination?.tags ?? destination_inline.tags ?? [];
  const imageUrl = destination?.image_url ?? null;

  const scoreColor =
    ai_score >= 8 ? "var(--teal)" : ai_score >= 6 ? "var(--gold)" : "var(--ink-muted)";

  const memberEntries = Object.entries(personality_scores);

  const rankLabel = rank === 1 ? "Best match" : rank === 2 ? "Runner-up" : "Third pick";
  const rankBg =
    rank === 1
      ? { bg: "rgba(46,125,107,0.12)", color: "var(--teal)", border: "rgba(46,125,107,0.25)" }
      : rank === 2
      ? { bg: "rgba(200,150,62,0.1)", color: "var(--gold)", border: "rgba(200,150,62,0.25)" }
      : { bg: "rgba(176,168,158,0.12)", color: "var(--ink-muted)", border: "rgba(176,168,158,0.25)" };

  // Gradient placeholders for worldwide destinations without a DB image
  const gradients = [
    "linear-gradient(135deg, #2E7D6B 0%, #1a4d40 50%, #C8963E 100%)",
    "linear-gradient(135deg, #B85C1A 0%, #8b3a10 50%, #2E7D6B 100%)",
    "linear-gradient(135deg, #4a6fa5 0%, #2d4a73 50%, #C8963E 100%)",
  ];
  const placeholderGradient = gradients[(rank - 1) % gradients.length];

  return (
    <div
      className="flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: "var(--cream)",
        border: "1.5px solid var(--border)",
        boxShadow: "0 2px 24px rgba(26,22,18,0.07)",
      }}
    >
      {/* Image or gradient placeholder */}
      <div className="relative w-full h-44 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-end p-4"
            style={{ background: placeholderGradient }}
          >
            <div className="flex flex-col gap-0.5">
              <span
                className="text-lg font-bold leading-tight"
                style={{ color: "rgba(255,255,255,0.95)", fontFamily: "var(--font-playfair)" }}
              >
                {displayName}
              </span>
              <span
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-dm-sans)" }}
              >
                {displayCountry}
              </span>
            </div>
          </div>
        )}

        {/* Rank badge */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: rankBg.bg,
            color: rankBg.color,
            border: `1px solid ${rankBg.border}`,
            backdropFilter: "blur(8px)",
          }}
        >
          {rankLabel}
        </div>

        {/* Score badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(26,22,18,0.65)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill={scoreColor} stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span
            className="text-xs font-bold"
            style={{ color: "white", fontFamily: "var(--font-dm-sans)" }}
          >
            {ai_score.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* Name + country */}
        <div className="flex flex-col gap-0.5">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            {displayName}
          </h2>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            {displayCountry}
          </p>
        </div>

        {/* Description */}
        {displayDescription && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            {displayDescription}
          </p>
        )}

        {/* Match explanation */}
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
          {match_explanation}
        </p>

        {/* Per-member scores */}
        {memberEntries.length > 0 && (
          <div
            className="flex flex-col gap-3 p-4 rounded-2xl"
            style={{ background: "var(--sand)", border: "1px solid var(--border)" }}
          >
            <p
              className="text-xs font-semibold tracking-wide uppercase"
              style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
            >
              Works for everyone
            </p>
            <div className="flex flex-col gap-2.5">
              {memberEntries.map(([name, score]) => (
                <div key={name} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
                    >
                      {name}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: score >= 75 ? "var(--teal)" : score >= 50 ? "var(--gold)" : "var(--ink-muted)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      {score}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${score}%`,
                        background:
                          score >= 75
                            ? "var(--teal)"
                            : score >= 50
                            ? "var(--gold)"
                            : "var(--rose)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compromise notes */}
        {compromise_notes && (
          <div
            className="flex gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(200,150,62,0.06)", border: "1px solid rgba(200,150,62,0.18)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              {compromise_notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs"
                style={{
                  background: "rgba(46,125,107,0.08)",
                  color: "var(--teal)",
                  fontFamily: "var(--font-dm-sans)",
                  border: "1px solid rgba(46,125,107,0.15)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Select error */}
        {selectError && (
          <p className="text-xs text-center" style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}>
            {selectError}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handleSelect}
          disabled={selecting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-70"
          style={{
            background: "var(--burnt-orange)",
            color: "var(--cream)",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: selecting ? "none" : "0 4px 16px rgba(184,92,26,0.22)",
          }}
        >
          {selecting ? (
            <span className="flex items-center justify-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full border-2 animate-spin inline-block"
                style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }}
              />
              Saving…
            </span>
          ) : (
            "Select this destination"
          )}
        </button>
      </div>
    </div>
  );
}
