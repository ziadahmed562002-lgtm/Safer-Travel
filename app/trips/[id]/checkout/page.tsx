"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BookingNeeds = {
  flights: boolean;
  accommodation: boolean;
  experiences: boolean;
};

type Trip = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selected_destination: any;
  booking_needs: BookingNeeds | null;
};

type TripFlight = {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  offer_data: any;
};

type TripHotel = {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hotel_data: any;
};

type TripExperience = {
  id: string;
  title: string;
  est_cost: string;
  product_code: string | null;
  web_url: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number | string | undefined, currency = "USD") {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function StarRow({ count }: { count: number }) {
  return (
    <span style={{ color: "var(--gold)", letterSpacing: 1 }}>
      {"★".repeat(Math.max(0, Math.min(5, count)))}
      {"☆".repeat(Math.max(0, 5 - Math.min(5, count)))}
    </span>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [memberCount, setMemberCount] = useState(1);
  const [flight, setFlight] = useState<TripFlight | null>(null);
  const [hotel, setHotel] = useState<TripHotel | null>(null);
  const [experiences, setExperiences] = useState<TripExperience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const [
        { data: tripData },
        { data: membersData },
        { data: flightData },
        { data: hotelData },
        { data: experiencesData },
      ] = await Promise.all([
        supabase
          .from("trips")
          .select("id, name, start_date, end_date, selected_destination, booking_needs")
          .eq("id", id)
          .single(),
        supabase
          .from("trip_members")
          .select("id")
          .eq("trip_id", id),
        supabase
          .from("trip_flights")
          .select("id, offer_data")
          .eq("trip_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("trip_hotels")
          .select("id, hotel_data")
          .eq("trip_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("trip_experiences")
          .select("id, title, est_cost, product_code, web_url")
          .eq("trip_id", id)
          .order("created_at", { ascending: true }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (tripData) setTrip(tripData as any);
      if (membersData) setMemberCount(Math.max(1, membersData.length));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (flightData) setFlight(flightData as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (hotelData) setHotel(hotelData as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (experiencesData) setExperiences(experiencesData as any);

      setLoading(false);
    }
    load();
  }, [id, router]);

  const dest = trip?.selected_destination;
  const destName = dest?.name ?? "Your destination";
  const needs = trip?.booking_needs;

  // Determine which modules are active (fall back to showing all if booking_needs not set)
  const showFlights = !needs || needs.flights;
  const showAccommodation = !needs || needs.accommodation;
  const showExperiences = !needs || needs.experiences;

  // ── Flight data ───────────────────────────────────────────────────────────
  const flightOffer = flight?.offer_data;
  const flightPricePerPerson = flightOffer?.total_amount ? parseFloat(flightOffer.total_amount) : null;
  const flightCurrency = flightOffer?.total_currency ?? "USD";
  const flightTotal = flightPricePerPerson != null ? flightPricePerPerson * memberCount : null;

  // Route: read origin from first segment, destination from last segment of first slice
  const firstSlice = flightOffer?.slices?.[0];
  const segments: { origin: { iata_code: string }; destination: { iata_code: string }; marketing_carrier?: { name: string }; operating_carrier?: { name: string } }[] =
    firstSlice?.segments ?? [];
  const originCode = segments[0]?.origin?.iata_code ?? null;
  const destCode = segments[segments.length - 1]?.destination?.iata_code ?? null;
  const airlineName = segments[0]?.marketing_carrier?.name ?? segments[0]?.operating_carrier?.name ?? flightOffer?.owner?.name ?? null;
  const isRoundTrip = (flightOffer?.slices?.length ?? 0) > 1;
  const flightLabel = originCode && destCode
    ? `${originCode} → ${destCode}${isRoundTrip ? " (Round trip)" : ""}`
    : null;

  // ── Hotel data ─────────────────────────────────────────────────────────────
  const hotelInfo = hotel?.hotel_data;
  // Use pre-computed total from best_room; fall back to min_rate × nights
  const hotelTotal: number | null = (() => {
    const roomTotal = hotelInfo?.best_room?.net != null
      ? parseFloat(hotelInfo.best_room.net)
      : null;
    const minRate = hotelInfo?.min_rate ? parseFloat(hotelInfo.min_rate) : null;
    const nights = hotelInfo?.nights ?? 1;
    // best_room.net from Hotelbeds is already the total net for the stay
    return roomTotal ?? (minRate != null ? minRate * nights : null);
  })();
  const hotelNights: number = hotelInfo?.nights ?? 1;
  const hotelCurrency: string = hotelInfo?.currency ?? "EUR";
  const hotelRatePerNight: number | null = hotelTotal != null ? hotelTotal / hotelNights : null;

  // ── Cost flags (currencies differ — never combine) ─────────────────────────
  const hasFlightCost = showFlights && flightTotal != null;
  const hasHotelCost = showAccommodation && hotelTotal != null;
  const currenciesMatch = flightCurrency === hotelCurrency;

  // Book button label
  const bookLabel = (() => {
    const hasFlight = showFlights && flight != null;
    const hasHotel = showAccommodation && hotel != null;
    if (hasFlight && hasHotel) return "Book Everything";
    if (hasFlight) return "Book Flight";
    if (hasHotel) return "Book Hotel";
    return "Book";
  })();

  return (
    <main className="relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 10%, rgba(200,150,62,0.07) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 90%, rgba(46,125,107,0.05) 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-6 px-5 py-10">
        {/* Back — smart link based on what was selected */}
        <Link
          href={showExperiences ? `/trips/${id}/experiences` : showAccommodation ? `/trips/${id}/hotels` : showFlights ? `/trips/${id}/flights` : `/trips/${id}/plan`}
          className="self-start flex items-center gap-1.5 text-sm"
          style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
            Checkout
          </p>
          <h1 className="text-3xl font-bold leading-snug" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
            Review your trip
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Confirm your selections before booking.
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Trip summary card */}
            <Section title="Trip Summary" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }>
              <SummaryRow label="Destination" value={destName} accent />
              {trip?.start_date ? (
                <SummaryRow
                  label="Dates"
                  value={`${formatDate(trip.start_date)} – ${formatDate(trip.end_date ?? null)}`}
                />
              ) : (
                <div className="flex items-start justify-between gap-4 py-1.5">
                  <span className="text-xs shrink-0" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>Dates</span>
                  <Link
                    href={`/trips/${id}/plan`}
                    className="text-xs font-semibold underline underline-offset-2"
                    style={{ color: "var(--rose)", fontFamily: "var(--font-dm-sans)" }}
                  >
                    Not set — add dates
                  </Link>
                </div>
              )}
              <SummaryRow label="Travellers" value={`${memberCount} ${memberCount === 1 ? "person" : "people"}`} />
            </Section>

            {/* Flight card — only shown if user needs flights */}
            {showFlights && (
              <Section title="Flight" changeHref={`/trips/${id}/flights`} icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 7.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
              }>
                {flight ? (
                  <>
                    {flightLabel && <SummaryRow label="Route" value={flightLabel} />}
                    {airlineName && <SummaryRow label="Airline" value={airlineName} />}
                    <SummaryRow label="Per person" value={flightPricePerPerson != null ? formatCurrency(flightPricePerPerson, flightCurrency) : "—"} />
                    <SummaryRow label={`× ${memberCount} traveller${memberCount !== 1 ? "s" : ""}`} value={flightTotal != null ? formatCurrency(flightTotal, flightCurrency) : "—"} accent />
                  </>
                ) : (
                  <EmptySelection label="No flight selected" linkHref={`/trips/${id}/flights`} linkLabel="Search flights" />
                )}
              </Section>
            )}

            {/* Hotel card — only shown if user needs accommodation */}
            {showAccommodation && (
              <Section title="Accommodation" changeHref={`/trips/${id}/hotels`} icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }>
                {hotel ? (
                  <>
                    <SummaryRow label="Hotel" value={hotelInfo?.name ?? "Selected hotel"} accent />
                    {(hotelInfo?.stars ?? 0) > 0 && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>Stars</span>
                        <StarRow count={hotelInfo.stars} />
                      </div>
                    )}
                    <SummaryRow label="Room" value={hotelInfo?.best_room?.room_name ?? "Standard room"} />
                    <SummaryRow
                      label={`${hotelNights} night${hotelNights !== 1 ? "s" : ""}${hotelRatePerNight != null ? ` × ${formatCurrency(hotelRatePerNight, hotelCurrency)}/night` : ""}`}
                      value={hotelTotal != null ? formatCurrency(hotelTotal, hotelCurrency) : "—"}
                      accent
                    />
                    {hotelInfo?.best_room?.refundable && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-xs" style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}>Free cancellation</span>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptySelection label="No hotel selected" linkHref={`/trips/${id}/hotels`} linkLabel="Browse hotels" />
                )}
              </Section>
            )}

            {/* Experiences — only shown if user selected experiences */}
            {showExperiences && (
              <Section title="Experiences" changeHref={`/trips/${id}/experiences`} icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }>
                {experiences.length > 0 ? (
                  <>
                    {/* Affiliate note */}
                    <div
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-3"
                      style={{ background: "rgba(200,150,62,0.07)", border: "1px solid rgba(200,150,62,0.2)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                      </svg>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
                        Click each experience to complete booking — your affiliate commission is tracked automatically.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {experiences.map((exp) => (
                        <div
                          key={exp.id}
                          className="flex flex-col gap-2 p-3 rounded-xl"
                          style={{ background: "var(--sand)", border: "1px solid var(--border)" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs leading-snug font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                              {exp.title}
                            </span>
                            {exp.est_cost && (
                              <span className="text-xs shrink-0" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                                {exp.est_cost}
                              </span>
                            )}
                          </div>
                          {exp.web_url && (
                            <a
                              href={exp.web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                              style={{
                                background: "var(--teal)",
                                color: "var(--cream)",
                                fontFamily: "var(--font-dm-sans)",
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              Complete booking on Viator
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptySelection label="No experiences saved" linkHref={`/trips/${id}/experiences`} linkLabel="Browse experiences" />
                )}
              </Section>
            )}

            {/* Totals — shown per currency, never combined across currencies */}
            {(hasFlightCost || hasHotelCost) && (
              <div
                className="flex flex-col gap-0 px-5 py-4 rounded-2xl"
                style={{
                  background: "var(--cream)",
                  border: "1.5px solid var(--border)",
                  boxShadow: "0 1px 10px rgba(26,22,18,0.05)",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                  Estimated totals
                </p>

                {hasFlightCost && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                      Flights ({memberCount} × {formatCurrency(flightPricePerPerson!, flightCurrency)})
                    </span>
                    <span className="text-base font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                      {formatCurrency(flightTotal!, flightCurrency)}
                    </span>
                  </div>
                )}

                {hasHotelCost && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
                      Hotel ({hotelNights} night{hotelNights !== 1 ? "s" : ""})
                    </span>
                    <span className="text-base font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                      {formatCurrency(hotelTotal!, hotelCurrency)}
                    </span>
                  </div>
                )}

                {hasFlightCost && hasHotelCost && !currenciesMatch && (
                  <p className="text-xs mt-2 pt-2" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)", borderTop: "1px solid var(--border)" }}>
                    Flights billed in {flightCurrency}, hotel in {hotelCurrency} — totals shown separately.
                  </p>
                )}

                {hasFlightCost && hasHotelCost && currenciesMatch && (
                  <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>Combined</span>
                    <span className="text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                      {formatCurrency(flightTotal! + hotelTotal!, flightCurrency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Book button */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                className="w-full py-4 rounded-xl text-sm font-semibold text-center transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: "var(--burnt-orange)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 4px 16px rgba(184,92,26,0.24)",
                  cursor: "default",
                }}
                disabled
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {bookLabel}
              </button>

              {/* Stripe coming soon badge */}
              <div
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(139,109,216,0.08)",
                  border: "1px solid rgba(139,109,216,0.18)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b6dd8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <p className="text-xs font-medium" style={{ color: "#8b6dd8", fontFamily: "var(--font-dm-sans)" }}>
                  Stripe integration coming soon — payments not yet live
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  icon,
  changeHref,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  changeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 p-5 rounded-2xl"
      style={{
        background: "var(--cream)",
        border: "1.5px solid var(--border)",
        boxShadow: "0 1px 10px rgba(26,22,18,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--teal)" }}>{icon}</span>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
            {title}
          </p>
        </div>
        {changeHref && (
          <Link
            href={changeHref}
            className="text-xs font-medium"
            style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
          >
            Change →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
        {label}
      </span>
      <span
        className="text-xs font-semibold text-right"
        style={{ color: accent ? "var(--ink)" : "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}
      >
        {value}
      </span>
    </div>
  );
}

function EmptySelection({ label, linkHref, linkLabel }: { label: string; linkHref: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>{label}</span>
      <Link
        href={linkHref}
        className="text-xs font-semibold underline underline-offset-2"
        style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 rounded-2xl animate-pulse"
          style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
        />
      ))}
    </div>
  );
}
