"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Destination = {
  id: string;
  name: string;
  country: string;
  description: string;
  tags: string[];
};

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #2E7D6B 0%, #1a4d40 100%)",
  "linear-gradient(135deg, #C8963E 0%, #8b6420 100%)",
  "linear-gradient(135deg, #4a6fa5 0%, #2d4a73 100%)",
  "linear-gradient(135deg, #B85C1A 0%, #7a3a0f 100%)",
  "linear-gradient(135deg, #6b5f8a 0%, #3d3355 100%)",
  "linear-gradient(135deg, #2E7D6B 0%, #4a6fa5 100%)",
  "linear-gradient(135deg, #C8963E 0%, #B85C1A 100%)",
  "linear-gradient(135deg, #3d3355 0%, #2E7D6B 100%)",
];

export default function ExplorePage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null); // destination id being processed

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("destinations")
        .select("id, name, country, description, tags")
        .order("name");
      setDestinations(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleStartTrip(dest: Destination) {
    setStarting(dest.id);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({
        name: `Trip to ${dest.name}`,
        organizer_id: session.user.id,
        invite_code: inviteCode,
        selected_destination: {
          name: dest.name,
          country: dest.country,
          description: dest.description,
          image_url: null,
          image_search_query: `${dest.name} ${dest.country} travel`,
          tags: dest.tags,
          destination_id: dest.id,
        },
      })
      .select()
      .single();

    if (tripErr || !trip) {
      setStarting(null);
      return;
    }

    await supabase.from("trip_members").insert({
      trip_id: trip.id,
      user_id: session.user.id,
      role: "organizer",
    });

    router.push(`/onboarding?trip=${trip.id}`);
  }

  return (
    <main className="relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 20%, rgba(46,125,107,0.07) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(200,150,62,0.06) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
            Explore
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Know where you want to go? Start planning instantly.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }} />
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 p-8 rounded-2xl text-center"
            style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
          >
            <p className="text-base font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              No destinations yet
            </p>
            <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              Use the AI matching flow to discover great destinations for your group.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {destinations.map((dest, i) => (
              <DestinationCard
                key={dest.id}
                dest={dest}
                gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
                loading={starting === dest.id}
                onStart={() => handleStartTrip(dest)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function DestinationCard({
  dest,
  gradient,
  loading,
  onStart,
}: {
  dest: Destination;
  gradient: string;
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <button
      onClick={onStart}
      disabled={loading}
      className="flex flex-col rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] disabled:opacity-70"
      style={{
        background: "var(--cream)",
        border: "1.5px solid var(--border)",
        boxShadow: "0 1px 10px rgba(26,22,18,0.06)",
      }}
    >
      {/* Gradient hero */}
      <div className="relative h-24 w-full flex items-end p-3" style={{ background: gradient }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} />
          </div>
        )}
        {/* First tag pill */}
        {dest.tags?.[0] && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(4px)",
              fontFamily: "var(--font-dm-sans)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            {dest.tags[0]}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          {dest.name}
        </p>
        <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          {dest.country}
        </p>
        {/* Additional tags */}
        {dest.tags?.slice(1, 3).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {dest.tags.slice(1, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--sand)", color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
