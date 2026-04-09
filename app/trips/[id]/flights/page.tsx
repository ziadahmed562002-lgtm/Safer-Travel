"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Segment = {
  departing_at: string;
  arriving_at: string;
  origin: { iata_code: string; name: string };
  destination: { iata_code: string; name: string };
  airline: string;
  flight_number: string | null;
  stops: number;
};

type Slice = {
  duration: string;
  segments: Segment[];
};

type Offer = {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: Slice[];
};

type CityResult = {
  city: string;
  origin_iata: string | null;
  members: string[];
  offers: Offer[];
  error: string | null;
};

type FlightResults = {
  destination: string;
  destination_iata: string;
  departure_date: string;
  return_date: string | null;
  results: CityResult[];
};

type BookingNeeds = {
  flights: boolean;
  accommodation: boolean;
  experiences: boolean;
};

type PendingSelection = {
  offer: Offer;
  city: string;
  members: string[];
};

export default function FlightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<FlightResults | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [bookingNeeds, setBookingNeeds] = useState<BookingNeeds | null>(null);

  useEffect(() => {
    async function search() {
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
      if (needs && needs.flights === false) {
        router.push(`/trips/${id}/plan`);
        return;
      }
      setBookingNeeds(needs);

      try {
        const res = await fetch(`/api/trips/${id}/flights`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Search failed");
        } else {
          setData(json);
        }
      } catch {
        setError("Network error — please try again");
      }

      setLoading(false);
    }

    search();
  }, [id, router]);

  async function handleConfirm() {
    if (!pending) return;
    setConfirming(true);
    setConfirmError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConfirmError("Session expired — please refresh");
      setConfirming(false);
      return;
    }

    const { error: saveErr } = await supabase.from("trip_flights").insert({
      trip_id: id,
      user_id: user.id,
      duffel_offer_id: pending.offer.id,
      offer_data: pending.offer,
      status: "selected",
    });

    if (saveErr) {
      console.error("[flights] save error:", saveErr.message);
      setConfirmError(saveErr.message);
      setConfirming(false);
      return;
    }

    if (bookingNeeds?.accommodation) {
      router.push(`/trips/${id}/hotels`);
    } else if (bookingNeeds?.experiences) {
      router.push(`/trips/${id}/experiences`);
    } else {
      router.push(`/trips/${id}/checkout`);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh gap-4" style={{ background: "var(--sand)" }}>
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }}
        />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            Searching flights…
          </p>
          <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            Checking live availability across carriers
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4" style={{ background: "var(--sand)" }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(196,105,90,0.12)", border: "1.5px solid rgba(196,105,90,0.2)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-center" style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </p>
        <Link
          href={`/trips/${id}/plan`}
          className="text-sm font-semibold underline"
          style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
        >
          Back to plan
        </Link>
      </main>
    );
  }

  const isRoundTrip = !!data?.return_date;

  return (
    <>
      <main className="relative flex flex-col min-h-dvh page-enter" style={{ background: "var(--sand)" }}>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 80% 5%, rgba(46,125,107,0.07) 0%, transparent 50%)`,
          }}
        />

        <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
          {/* Back */}
          <Link
            href={`/trips/${id}/plan`}
            className="self-start flex items-center gap-1.5 text-sm"
            style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to plan
          </Link>

          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
              Flights
            </p>
            <h1 className="text-3xl font-bold leading-snug" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              To {data?.destination}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                {formatDate(data?.departure_date ?? "")}
                {data?.return_date && ` — ${formatDate(data.return_date)}`}
              </p>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: isRoundTrip ? "rgba(46,125,107,0.1)" : "rgba(200,150,62,0.1)",
                  color: isRoundTrip ? "var(--teal)" : "var(--gold)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {isRoundTrip ? "Round trip" : "One way"}
              </span>
            </div>
          </div>

          {/* Results per departure city */}
          {data?.results.map((cityResult) => (
            <CitySection
              key={cityResult.city}
              result={cityResult}
              destIATA={data.destination_iata}
              isRoundTrip={isRoundTrip}
              onSelect={(offer) => setPending({ offer, city: cityResult.city, members: cityResult.members })}
            />
          ))}
        </div>
      </main>

      {/* Confirmation sheet */}
      {pending && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(26,22,18,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => !confirming && setPending(null)}
          />

          {/* Sheet */}
          <div
            className="relative flex flex-col gap-5 px-5 pt-6 pb-8 rounded-t-3xl"
            style={{
              background: "var(--cream)",
              boxShadow: "0 -8px 40px rgba(26,22,18,0.18)",
            }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto -mt-1" style={{ background: "var(--border)" }} />

            {/* Title */}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
                Confirm flight
              </p>
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
                {pending.offer.slices[0].segments[0].origin.iata_code}
                {" → "}
                {(() => {
                  const lastSeg = pending.offer.slices[0].segments;
                  return lastSeg[lastSeg.length - 1].destination.iata_code;
                })()}
                {pending.offer.slices[1] && ` · ${pending.offer.slices[1].segments[0].origin.iata_code} → ${(() => { const s = pending.offer.slices[1].segments; return s[s.length-1].destination.iata_code; })()}`}
              </h2>
              <p className="text-sm" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                Flying from {pending.city} · {pending.members.join(", ")}
              </p>
            </div>

            {/* Flight summary */}
            <div
              className="flex flex-col gap-0 rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid var(--border)" }}
            >
              {pending.offer.slices.map((slice, i) => (
                <div key={i}>
                  {i > 0 && <div className="h-px" style={{ background: "var(--border)" }} />}
                  <ModalSliceRow slice={slice} label={pending.offer.slices.length > 1 ? (i === 0 ? "Outbound" : "Return") : undefined} />
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                  Total per person
                </p>
                <p className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                  {pending.offer.total_currency === "USD" ? "$" : `${pending.offer.total_currency} `}
                  {parseFloat(pending.offer.total_amount).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <div
                className="px-3 py-2 rounded-xl text-xs text-center"
                style={{
                  background: "rgba(46,125,107,0.08)",
                  border: "1px solid rgba(46,125,107,0.18)",
                  color: "var(--teal)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                <span className="font-semibold">{pending.members.length}</span>
                <br />
                {pending.members.length === 1 ? "traveller" : "travellers"}
              </div>
            </div>

            {/* Error */}
            {confirmError && (
              <p className="text-xs text-center" style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}>
                {confirmError}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-70"
                style={{
                  background: "var(--teal)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: confirming ? "none" : "0 4px 16px rgba(46,125,107,0.28)",
                }}
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 animate-spin inline-block"
                      style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }}
                    />
                    Saving…
                  </span>
                ) : (
                  bookingNeeds?.accommodation
                    ? "Confirm & Continue to Hotels"
                    : bookingNeeds?.experiences
                    ? "Confirm & Continue to Experiences"
                    : "Confirm & Continue to Checkout"
                )}
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={confirming}
                className="w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: "transparent",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CitySection({
  result,
  destIATA,
  isRoundTrip,
  onSelect,
}: {
  result: CityResult;
  destIATA: string;
  isRoundTrip: boolean;
  onSelect: (offer: Offer) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* City header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="text-xs font-semibold tracking-wide"
            style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
          >
            From {result.city}{result.origin_iata ? ` (${result.origin_iata})` : ""}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {result.members.join(", ")}
          </span>
        </div>
        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      </div>

      {result.error && (
        <div
          className="p-3 rounded-xl text-xs text-center"
          style={{
            background: "rgba(196,105,90,0.08)",
            border: "1px solid rgba(196,105,90,0.18)",
            color: "var(--rose)",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          {result.error}
        </div>
      )}

      {!result.error && result.offers.length === 0 && (
        <div
          className="p-4 rounded-xl text-sm text-center"
          style={{
            background: "var(--cream)",
            border: "1.5px solid var(--border)",
            color: "var(--ink-faint)",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          No flights found from {result.city}
        </div>
      )}

      {result.offers.map((offer, i) => (
        <FlightCard
          key={offer.id}
          offer={offer}
          isRoundTrip={isRoundTrip}
          isCheapest={i === 0}
          onSelect={() => onSelect(offer)}
        />
      ))}
    </div>
  );
}

/* Airline color based on first letter */
function airlineColor(name: string): string {
  const colors = ["#2E7D6B","#C8963E","#B85C1A","#C4695A","#4A6FA5","#6B5F55"];
  return colors[(name.charCodeAt(0) ?? 0) % colors.length];
}

function AirlineBadge({ airline }: { airline: string }) {
  const initials = airline.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const color = airlineColor(airline);
  return (
    <div
      style={{
        width: 32, height: 32, borderRadius: 10,
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 700, fontFamily: "var(--font-dm-sans)", letterSpacing: "0.02em" }}>
        {initials}
      </span>
    </div>
  );
}

function FlightCard({
  offer,
  isRoundTrip,
  isCheapest,
  onSelect,
}: {
  offer: Offer;
  isRoundTrip: boolean;
  isCheapest: boolean;
  onSelect: () => void;
}) {
  const outbound = offer.slices[0];
  const returnSlice = isRoundTrip ? offer.slices[1] : null;
  const airline = outbound.segments[0]?.airline ?? "";
  const stops = outbound.segments.length - 1;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden card-lift"
      style={{
        background: "var(--cream)",
        border: `1.5px solid ${isCheapest ? "rgba(46,125,107,0.3)" : "var(--border)"}`,
        boxShadow: isCheapest ? "0 4px 20px rgba(46,125,107,0.12)" : "0 1px 8px rgba(26,22,18,0.05)",
      }}
    >
      {isCheapest && (
        <div
          className="px-4 py-1.5 text-xs font-semibold text-center"
          style={{
            background: "rgba(46,125,107,0.1)",
            color: "var(--teal)",
            fontFamily: "var(--font-dm-sans)",
            borderBottom: "1px solid rgba(46,125,107,0.15)",
          }}
        >
          ✦ Cheapest option
        </div>
      )}

      {/* Airline header row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1">
        <AirlineBadge airline={airline} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {airline || "Airline"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {stops === 0 ? (
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>Direct</span>
            ) : (
              `${stops} stop${stops > 1 ? "s" : ""}`
            )}
            {isRoundTrip ? " · Round trip" : " · One way"}
          </p>
        </div>
        {/* Price hero */}
        <div className="text-right">
          <span className="text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {offer.total_currency === "USD" ? "$" : `${offer.total_currency} `}
            {parseFloat(offer.total_amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>/ person</p>
        </div>
      </div>

      <div className="flex flex-col" style={{ borderTop: "1px solid var(--border)", marginTop: 4 }}>
        <SliceRow slice={outbound} label={isRoundTrip ? "Outbound" : undefined} />
        {returnSlice && (
          <>
            <div className="h-px mx-4" style={{ background: "var(--border)" }} />
            <SliceRow slice={returnSlice} label="Return" />
          </>
        )}
      </div>

      {/* Select button */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={onSelect}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] hover:brightness-105"
          style={{
            background: "var(--teal)",
            color: "var(--cream)",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 3px 14px rgba(46,125,107,0.26)",
          }}
        >
          Select this flight →
        </button>
      </div>
    </div>
  );
}

function SliceRow({ slice, label }: { slice: Slice; label?: string }) {
  const first = slice.segments[0];
  const last = slice.segments[slice.segments.length - 1];
  const stops = slice.segments.length - 1;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          {label}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col items-start">
          <span className="text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {first.origin.iata_code}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {formatTime(first.departing_at)}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {formatDuration(slice.duration)}
          </span>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <span
            className="text-xs"
            style={{
              color: stops === 0 ? "var(--teal)" : "var(--gold)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {last.destination.iata_code}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {formatTime(last.arriving_at)}
          </span>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
        {first.airline}{first.flight_number ? ` · ${first.flight_number}` : ""}
      </p>
    </div>
  );
}

// Compact version for the modal (no padding wrapper)
function ModalSliceRow({ slice, label }: { slice: Slice; label?: string }) {
  const first = slice.segments[0];
  const last = slice.segments[slice.segments.length - 1];
  const stops = slice.segments.length - 1;

  return (
    <div className="flex flex-col gap-2 px-4 py-3" style={{ background: "var(--sand)" }}>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          {label}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex flex-col">
          <span className="font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {first.origin.iata_code}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {formatTime(first.departing_at)}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {formatDuration(slice.duration)}
          </span>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <span
            className="text-xs"
            style={{ color: stops === 0 ? "var(--teal)" : "var(--gold)", fontFamily: "var(--font-dm-sans)" }}
          >
            {stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {last.destination.iata_code}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            {formatTime(last.arriving_at)}
          </span>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
        {first.airline}{first.flight_number ? ` · ${first.flight_number}` : ""}
      </p>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h` : "";
  const m = match[2] ? ` ${match[2]}m` : "";
  return (h + m).trim() || iso;
}
