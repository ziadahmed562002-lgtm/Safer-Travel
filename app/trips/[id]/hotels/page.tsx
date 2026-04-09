"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RoomOption = {
  room_name: string;
  rate_key: string;
  net: number;       // total net for the stay
  payment_type: string;
  refundable: boolean;
};

type Hotel = {
  code: number;
  name: string;
  stars: number;
  category_name: string;
  latitude: number;
  longitude: number;
  zone_name?: string;
  min_rate: number;
  currency: string;
  nights: number;
  images: string[];
  rooms: RoomOption[];
};

type HotelResults = {
  destination: string;
  check_in: string;
  check_out: string;
  nights: number;
  hotels: Hotel[];
  test_mode_empty: boolean;
};

type PendingSelection = {
  hotel: Hotel;
  room: RoomOption;
};

type BookingNeeds = {
  flights: boolean;
  accommodation: boolean;
  experiences: boolean;
};

export default function HotelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<HotelResults | null>(null);
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

      const { data: tripData } = await supabase
        .from("trips")
        .select("booking_needs")
        .eq("id", id)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const needs: BookingNeeds | null = (tripData as any)?.booking_needs ?? null;
      if (needs && needs.accommodation === false) {
        router.push(`/trips/${id}/plan`);
        return;
      }
      setBookingNeeds(needs);

      try {
        const res = await fetch(`/api/trips/${id}/hotels`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Hotel search failed");
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

    // Save hotel with selected room stored as best_room so checkout page works unchanged
    const { error: saveErr } = await supabase.from("trip_hotels").insert({
      trip_id: id,
      user_id: user.id,
      hotelbeds_rate_key: pending.room.rate_key,
      hotel_data: { ...pending.hotel, best_room: pending.room },
      status: "selected",
    });

    if (saveErr) {
      console.error("[hotels] save error:", saveErr.message);
      setConfirmError(saveErr.message);
      setConfirming(false);
      return;
    }

    if (bookingNeeds?.experiences) {
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
          style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
        />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            Finding hotels…
          </p>
          <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            Searching properties near your destination
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

  const currencySymbol = data?.hotels[0]?.currency === "EUR" ? "€" : data?.hotels[0]?.currency === "GBP" ? "£" : "$";

  return (
    <>
      <main className="relative flex flex-col min-h-dvh page-enter" style={{ background: "var(--sand)" }}>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 20% 10%, rgba(200,150,62,0.07) 0%, transparent 50%)`,
          }}
        />

        <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
          {/* Back */}
          <Link
            href={bookingNeeds?.flights ? `/trips/${id}/flights` : `/trips/${id}/plan`}
            className="self-start flex items-center gap-1.5 text-sm"
            style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            {bookingNeeds?.flights ? "Back to flights" : "Back to plan"}
          </Link>

          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
              Hotels
            </p>
            <h1 className="text-3xl font-bold leading-snug" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              Stay in {data?.destination}
            </h1>
            <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              {formatDate(data?.check_in ?? "")} — {formatDate(data?.check_out ?? "")}
              {data && (
                <span style={{ color: "var(--ink-faint)" }}>
                  {" "}· {data.nights} night{data.nights !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          {/* Test-mode empty */}
          {data?.hotels.length === 0 && data?.test_mode_empty && (
            <div
              className="flex flex-col gap-4 p-5 rounded-2xl"
              style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(200,150,62,0.1)", border: "1px solid rgba(200,150,62,0.2)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                    Limited test inventory
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                    The Hotelbeds test environment doesn{"'"}t have inventory for {data.destination}. Full live inventory will be available in production.
                  </p>
                </div>
              </div>
              <Link
                href={bookingNeeds?.experiences ? `/trips/${id}/experiences` : `/trips/${id}/checkout`}
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all active:scale-[0.98]"
                style={{
                  background: "var(--teal)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 3px 12px rgba(46,125,107,0.22)",
                }}
              >
                {bookingNeeds?.experiences ? "Continue to Experiences →" : "Continue to Checkout →"}
              </Link>
            </div>
          )}

          {data?.hotels.length === 0 && !data?.test_mode_empty && (
            <div
              className="p-5 rounded-2xl text-sm text-center"
              style={{
                background: "var(--cream)",
                border: "1.5px solid var(--border)",
                color: "var(--ink-faint)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              No hotels found for these dates. Try adjusting the trip dates on the plan page.
            </div>
          )}

          {/* Hotel cards */}
          <div className="flex flex-col gap-4">
            {data?.hotels.map((hotel, i) => (
              <HotelCard
                key={hotel.code}
                hotel={hotel}
                nights={data.nights}
                isTopPick={i === 0}
                onSelectRoom={(room) => setPending({ hotel, room })}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Confirmation sheet */}
      {pending && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(26,22,18,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => !confirming && setPending(null)}
          />

          <div
            className="relative flex flex-col gap-5 px-5 pt-6 pb-8 rounded-t-3xl"
            style={{ background: "var(--cream)", boxShadow: "0 -8px 40px rgba(26,22,18,0.18)" }}
          >
            <div className="w-10 h-1 rounded-full mx-auto -mt-1" style={{ background: "var(--border)" }} />

            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
                Confirm hotel
              </p>
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
                {pending.hotel.name}
              </h2>
              {pending.hotel.zone_name && (
                <p className="text-sm" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                  {pending.hotel.zone_name}
                </p>
              )}
            </div>

            <div
              className="flex flex-col gap-3 p-4 rounded-2xl"
              style={{ background: "var(--sand)", border: "1px solid var(--border)" }}
            >
              {pending.hotel.stars > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: pending.hotel.stars }).map((_, i) => (
                      <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="var(--gold)" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                    {pending.hotel.category_name}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>Room type</p>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                    {pending.room.room_name}
                  </p>
                </div>
                {pending.room.refundable && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: "rgba(46,125,107,0.1)",
                      color: "var(--teal)",
                      border: "1px solid rgba(46,125,107,0.2)",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    ✓ Free cancellation
                  </span>
                )}
              </div>

              <div className="flex justify-between text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                <span>{formatDate(data?.check_in ?? "")} — {formatDate(data?.check_out ?? "")}</span>
                <span>{pending.hotel.nights} night{pending.hotel.nights !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                  {getCurrencySymbol(pending.hotel.currency)}{(pending.room.net / Math.max(pending.hotel.nights, 1)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / night
                </p>
                <p className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                  {getCurrencySymbol(pending.hotel.currency)}{pending.room.net.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--ink-faint)" }}>total</span>
                </p>
              </div>
              {pending.room.payment_type === "AT_HOTEL" && (
                <span
                  className="px-2.5 py-1 rounded-xl text-xs font-medium"
                  style={{
                    background: "rgba(200,150,62,0.1)",
                    color: "var(--gold)",
                    border: "1px solid rgba(200,150,62,0.2)",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  Pay at hotel
                </span>
              )}
            </div>

            {confirmError && (
              <p className="text-xs text-center" style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}>
                {confirmError}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-70"
                style={{
                  background: "var(--gold)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: confirming ? "none" : "0 4px 16px rgba(200,150,62,0.35)",
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
                  bookingNeeds?.experiences ? "Confirm & Continue to Experiences" : "Confirm & Continue to Checkout"
                )}
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={confirming}
                className="w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: "transparent", color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
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

function getCurrencySymbol(currency: string) {
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  return "$";
}

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #2E7D6B 0%, #1a4d40 100%)",
  "linear-gradient(135deg, #C8963E 0%, #8b6420 100%)",
  "linear-gradient(135deg, #4a6fa5 0%, #2d4a73 100%)",
  "linear-gradient(135deg, #B85C1A 0%, #7a3a0f 100%)",
  "linear-gradient(135deg, #6b5f8a 0%, #3d3355 100%)",
];

function HotelCard({
  hotel,
  nights,
  isTopPick,
  onSelectRoom,
}: {
  hotel: Hotel;
  nights: number;
  isTopPick: boolean;
  onSelectRoom: (room: RoomOption) => void;
}) {
  const [expanded, setExpanded] = useState(isTopPick);
  const [imgError, setImgError] = useState(false);

  const pricePerNight = nights > 0 ? hotel.min_rate / nights : hotel.min_rate;
  const currencySymbol = getCurrencySymbol(hotel.currency);
  const heroImage = hotel.images[0];
  const gradient = CARD_GRADIENTS[hotel.code % CARD_GRADIENTS.length];

  return (
    <div
      className="flex flex-col rounded-3xl overflow-hidden card-lift"
      style={{
        background: "var(--cream)",
        border: `1.5px solid ${isTopPick ? "rgba(200,150,62,0.35)" : "var(--border)"}`,
        boxShadow: isTopPick ? "0 4px 24px rgba(200,150,62,0.12)" : "0 1px 12px rgba(26,22,18,0.06)",
      }}
    >
      {/* Hero */}
      <div className="relative h-36 w-full overflow-hidden" style={{ background: gradient }}>
        {heroImage && !imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={hotel.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {/* Overlay so badges are always readable */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)" }} />

        {isTopPick && (
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(200,150,62,0.25)",
              color: "#f5e4b0",
              border: "1px solid rgba(200,150,62,0.4)",
              backdropFilter: "blur(8px)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Top pick
          </div>
        )}
        {hotel.stars > 0 && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(26,22,18,0.55)", backdropFilter: "blur(8px)" }}
          >
            {Array.from({ length: hotel.stars }).map((_, i) => (
              <svg key={i} width="8" height="8" viewBox="0 0 24 24" fill="var(--gold)" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        )}
        {/* Fallback initial when no image */}
        {(!heroImage || imgError) && (
          <div className="absolute bottom-3 left-4">
            <span className="text-4xl font-bold" style={{ color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-playfair)" }}>
              {hotel.name[0]}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold leading-snug" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
            {hotel.name}
          </h3>
          {hotel.zone_name && (
            <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
              {hotel.zone_name}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0">
            <span className="text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
              {currencySymbol}{pricePerNight.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-xs font-normal ml-1" style={{ color: "var(--ink-faint)" }}>/ night</span>
            </span>
            <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
              {currencySymbol}{hotel.min_rate.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total · {hotel.rooms.length} room type{hotel.rooms.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            style={{
              background: expanded ? "rgba(46,125,107,0.1)" : "var(--sand)",
              color: expanded ? "var(--teal)" : "var(--ink-muted)",
              border: `1px solid ${expanded ? "rgba(46,125,107,0.2)" : "var(--border)"}`,
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {expanded ? "Hide rooms" : "See rooms"}
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Room list */}
        {expanded && (
          <div
            className="flex flex-col divide-y rounded-2xl overflow-hidden mt-1"
            style={{ border: "1px solid var(--border)", background: "var(--sand)" }}
          >
            {hotel.rooms.map((room) => {
              const roomPerNight = nights > 0 ? room.net / nights : room.net;
              return (
                <div key={room.rate_key} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                        {room.room_name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                        {currencySymbol}{roomPerNight.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/night
                        <span className="mx-1">·</span>
                        {currencySymbol}{room.net.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectRoom(room)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
                      style={{
                        background: "var(--gold)",
                        color: "var(--cream)",
                        fontFamily: "var(--font-dm-sans)",
                        boxShadow: "0 2px 8px rgba(200,150,62,0.28)",
                      }}
                    >
                      Select
                    </button>
                  </div>
                  {room.refundable && (
                    <span
                      className="self-start flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "rgba(46,125,107,0.08)",
                        color: "var(--teal)",
                        border: "1px solid rgba(46,125,107,0.18)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Free cancellation
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
