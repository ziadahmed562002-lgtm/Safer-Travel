"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SelectedDestination = {
  name: string;
  country: string;
  description: string;
  image_url: string | null;
  image_search_query: string;
  tags: string[];
  destination_id: string | null;
};

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
  selected_destination: SelectedDestination | null;
  booking_needs: BookingNeeds | null;
};

type ViewMode = "select" | "dates" | "plan";

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [needs, setNeeds] = useState<BookingNeeds>({
    flights: true,
    accommodation: true,
    experiences: true,
  });
  const [savingNeeds, setSavingNeeds] = useState(false);
  const [modalStart, setModalStart] = useState("");
  const [modalEnd, setModalEnd] = useState("");
  const [savingModalDates, setSavingModalDates] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("trips")
        .select("id, name, start_date, end_date, selected_destination, booking_needs")
        .eq("id", id)
        .single();

      if (error || !data) {
        router.push("/");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = data as any;
      setTrip(t);
      setStartDate(t.start_date ?? "");
      setEndDate(t.end_date ?? "");

      if (t.booking_needs) {
        setNeeds(t.booking_needs);
        setViewMode("plan");
      }

      setLoading(false);
    }

    load();
  }, [id, router]);

  function toggleNeed(key: keyof BookingNeeds) {
    setNeeds((n) => ({ ...n, [key]: !n[key] }));
  }

  async function saveNeeds() {
    const anySelected = needs.flights || needs.accommodation || needs.experiences;
    if (!anySelected) return;

    setSavingNeeds(true);
    await supabase
      .from("trips")
      .update({ booking_needs: needs })
      .eq("id", id);
    setSavingNeeds(false);

    // Flights and hotels both require dates — gate before proceeding
    const needsDates = needs.flights || needs.accommodation;
    if (needsDates && !startDate) {
      setModalStart(startDate);
      setModalEnd(endDate);
      setViewMode("dates");
    } else {
      setViewMode("plan");
    }
  }

  async function saveModalDates() {
    if (!modalStart) return;
    setSavingModalDates(true);
    await supabase
      .from("trips")
      .update({ start_date: modalStart, end_date: modalEnd || null })
      .eq("id", id);
    setStartDate(modalStart);
    setEndDate(modalEnd);
    setSavingModalDates(false);
    setViewMode("plan");
  }

  const saveDates = useCallback(async (fields: { start_date?: string; end_date?: string }) => {
    setSavingDates(true);
    const update: Record<string, string | null> = {};
    if ("start_date" in fields) update.start_date = fields.start_date || null;
    if ("end_date" in fields) update.end_date = fields.end_date || null;
    await supabase.from("trips").update(update).eq("id", id);
    setSavingDates(false);
  }, [id]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-dvh" style={{ background: "var(--sand)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            Loading your trip…
          </p>
        </div>
      </main>
    );
  }

  const dest = trip?.selected_destination;

  if (!dest) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4" style={{ background: "var(--sand)" }}>
        <p className="text-base text-center" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
          No destination selected yet.
        </p>
        <Link
          href={`/trips/${id}/results`}
          className="text-sm font-semibold underline"
          style={{ color: "var(--teal)", fontFamily: "var(--font-dm-sans)" }}
        >
          Back to results
        </Link>
      </main>
    );
  }

  const anySelected = needs.flights || needs.accommodation || needs.experiences;

  return (
    <main className="page-enter relative flex flex-col min-h-dvh" style={{ background: "var(--sand)" }}>
      {/* Hero */}
      <div className="relative w-full h-56 overflow-hidden">
        {dest.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #2E7D6B 0%, #1a4d40 50%, #C8963E 100%)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(26,22,18,0.7) 0%, rgba(26,22,18,0.1) 60%)" }}
        />
        <Link
          href={`/trips/${id}/results`}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl"
          style={{
            color: "rgba(255,255,255,0.9)",
            background: "rgba(26,22,18,0.45)",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Results
        </Link>
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--gold)", fontFamily: "var(--font-dm-sans)" }}>
            Selected destination
          </p>
          <h1 className="text-3xl font-bold leading-tight" style={{ fontFamily: "var(--font-playfair)", color: "white" }}>
            {dest.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-dm-sans)" }}>
            {dest.country}
          </p>
        </div>
      </div>

      <div className="relative flex flex-col gap-6 px-5 py-6 max-w-sm mx-auto w-full">
        {/* Description */}
        {dest.description && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
            {dest.description}
          </p>
        )}

        {/* Tags */}
        {dest.tags && dest.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dest.tags.map((tag) => (
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

        <div className="h-px" style={{ background: "var(--border)" }} />

        {/* Trip dates */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
                Trip dates
              </p>
              {!startDate && (
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded-md"
                  style={{
                    background: "rgba(196,105,90,0.1)",
                    color: "var(--rose)",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  Required
                </span>
              )}
            </div>
            {savingDates && (
              <span className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>Saving…</span>
            )}
          </div>
          <CalendarPicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={(v) => {
              setStartDate(v);
              const update: { start_date: string; end_date?: string } = { start_date: v };
              if (endDate && v > endDate) {
                setEndDate("");
                update.end_date = "";
              }
              saveDates(update);
            }}
            onEndChange={(v) => {
              setEndDate(v);
              saveDates({ end_date: v });
            }}
          />
        </div>

        <div className="h-px" style={{ background: "var(--border)" }} />

        {/* Booking needs */}
        {viewMode === "select" ? (
          <SelectNeedsStep
            needs={needs}
            onToggle={toggleNeed}
            onConfirm={saveNeeds}
            saving={savingNeeds}
            anySelected={anySelected}
          />
        ) : viewMode === "dates" ? (
          <DateGateModal
            start={modalStart}
            end={modalEnd}
            onChangeStart={setModalStart}
            onChangeEnd={setModalEnd}
            onConfirm={saveModalDates}
            onSkip={() => setViewMode("plan")}
            saving={savingModalDates}
            needsFlights={needs.flights}
            needsHotels={needs.accommodation}
          />
        ) : (
          <PlanStep
            id={id}
            dest={dest}
            needs={needs}
            onEdit={() => setViewMode("select")}
          />
        )}
      </div>
    </main>
  );
}

// ─── Selection step ───────────────────────────────────────────────────────────

function SelectNeedsStep({
  needs,
  onToggle,
  onConfirm,
  saving,
  anySelected,
}: {
  needs: BookingNeeds;
  onToggle: (k: keyof BookingNeeds) => void;
  onConfirm: () => void;
  saving: boolean;
  anySelected: boolean;
}) {
  const items: {
    key: keyof BookingNeeds;
    label: string;
    sub: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "flights",
      label: "Flights",
      sub: "Search and compare flights for your group",
      color: "var(--teal)",
      bg: "rgba(46,125,107,0.08)",
      border: "rgba(46,125,107,0.22)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 7.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
      ),
    },
    {
      key: "accommodation",
      label: "Accommodation",
      sub: "Browse hotels and places to stay",
      color: "var(--gold)",
      bg: "rgba(200,150,62,0.08)",
      border: "rgba(200,150,62,0.22)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      key: "experiences",
      label: "Experiences",
      sub: "AI-curated activities based on your interests",
      color: "var(--burnt-orange)",
      bg: "rgba(184,92,26,0.08)",
      border: "rgba(184,92,26,0.22)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
          What do you need help with?
        </p>
        <p className="text-xs" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          Toggle on only what applies — skip the rest.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map(({ key, label, sub, color, bg, border, icon }) => {
          const on = needs[key];
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: on ? bg : "var(--cream)",
                border: `1.5px solid ${on ? border : "var(--border)"}`,
                boxShadow: on ? `0 4px 16px ${bg}` : "none",
                transform: on ? "scale(1)" : "scale(0.99)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all relative"
                style={{
                  background: on ? bg : "var(--sand)",
                  color: on ? color : "var(--ink-faint)",
                  border: `1px solid ${on ? border : "var(--border)"}`,
                }}
              >
                {on && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center success-pop"
                    style={{ background: color }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: on ? color : "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
                >
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
                  {sub}
                </p>
              </div>
              {/* Toggle */}
              <div
                className="shrink-0 w-9 h-5 rounded-full relative transition-all"
                style={{ background: on ? color : "var(--border)", transition: "background 0.2s ease" }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                  style={{
                    left: on ? "calc(100% - 1.125rem)" : "0.125rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    transition: "left 0.2s cubic-bezier(0.34,1.2,0.64,1)",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onConfirm}
        disabled={!anySelected || saving}
        className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 mt-1"
        style={{
          background: !anySelected || saving ? "var(--border)" : "var(--burnt-orange)",
          color: !anySelected || saving ? "var(--ink-muted)" : "var(--cream)",
          fontFamily: "var(--font-dm-sans)",
          boxShadow: !anySelected || saving ? "none" : "0 4px 16px rgba(184,92,26,0.24)",
        }}
      >
        {saving ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}

// ─── Plan step (filtered sections) ───────────────────────────────────────────

function PlanStep({
  id,
  dest,
  needs,
  onEdit,
}: {
  id: string;
  dest: SelectedDestination;
  needs: BookingNeeds;
  onEdit: () => void;
}) {
  const selectedCount = [needs.flights, needs.accommodation, needs.experiences].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
          Your plan
        </p>
        <button
          onClick={onEdit}
          className="text-xs font-medium"
          style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
        >
          Edit ({selectedCount} module{selectedCount !== 1 ? "s" : ""})
        </button>
      </div>

      {/* Filtered sections */}
      <div className="flex flex-col gap-3">
        {needs.flights && (
          <PlanSection
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 7.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
            }
            title="Flights"
            description={`Search flights to ${dest.name} for your group`}
            href={`/trips/${id}/flights`}
            color="var(--teal)"
            bg="rgba(46,125,107,0.08)"
            border="rgba(46,125,107,0.18)"
          />
        )}

        {needs.accommodation && (
          <PlanSection
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
            title="Accommodation"
            description={`Find places to stay in ${dest.name}`}
            href={`/trips/${id}/hotels`}
            color="var(--gold)"
            bg="rgba(200,150,62,0.08)"
            border="rgba(200,150,62,0.18)"
          />
        )}

        {needs.experiences && (
          <PlanSection
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
            title="Experiences"
            description={`AI-curated activities for ${dest.name}`}
            href={`/trips/${id}/experiences`}
            color="var(--burnt-orange)"
            bg="rgba(184,92,26,0.08)"
            border="rgba(184,92,26,0.18)"
          />
        )}
      </div>

      {/* Go to checkout */}
      <Link
        href={`/trips/${id}/checkout`}
        className="w-full py-4 rounded-2xl font-bold text-center transition-all active:scale-[0.98] mt-1 flex items-center justify-center gap-2"
        style={{
          background: "var(--burnt-orange)",
          color: "#fff",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "0.9375rem",
          boxShadow: "0 4px 18px rgba(184,92,26,0.26)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Review & Checkout
      </Link>
    </div>
  );
}

function PlanSection({
  icon, title, description, href, color, bg, border,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      className="card-lift flex items-center gap-4 p-4 rounded-2xl"
      style={{
        background: "var(--cream)",
        border: "1.5px solid var(--border)",
        boxShadow: "0 1px 12px rgba(26,22,18,0.05)",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: bg, color, border: `1px solid ${border}` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}>
          {title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
        style={{
          background: bg,
          color,
          border: `1px solid ${border}`,
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        Start
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── Calendar picker ──────────────────────────────────────────────────────────

function CalendarPicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();

  const [viewYear, setViewYear] = useState(() =>
    startDate ? parseInt(startDate.split("-")[0]) : nowYear
  );
  const [viewMonth, setViewMonth] = useState(() =>
    startDate ? parseInt(startDate.split("-")[1]) - 1 : nowMonth
  );

  function toDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function handleDayClick(day: number) {
    const dateStr = toDateStr(day);
    if (dateStr < todayStr) return;

    if (!startDate || (startDate && endDate)) {
      onStartChange(dateStr);
      onEndChange("");
    } else {
      if (dateStr <= startDate) {
        onStartChange(dateStr);
        onEndChange("");
      } else {
        onEndChange(dateStr);
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const canGoPrev = viewYear > nowYear || (viewYear === nowYear && viewMonth > nowMonth);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDOW = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [
    ...Array(firstDOW).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: "var(--cream)", border: "1.5px solid var(--border)" }}
    >
      {/* Month navigation */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
          style={{ color: "var(--ink-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--ink)", fontFamily: "var(--font-dm-sans)" }}
        >
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{ color: "var(--ink-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-2 pt-3 pb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium py-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-2 pb-3">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="h-9" />;

          const dateStr = toDateStr(day);
          const isPast = dateStr < todayStr;
          const isStart = dateStr === startDate;
          const isEnd = endDate ? dateStr === endDate : false;
          const inRange = !!(startDate && endDate && dateStr > startDate && dateStr < endDate);
          const isToday = dateStr === todayStr;
          const hasRange = !!(startDate && endDate);

          const cellBg = inRange
            ? "rgba(46,125,107,0.1)"
            : isStart && hasRange
            ? "linear-gradient(to right, transparent 50%, rgba(46,125,107,0.1) 50%)"
            : isEnd
            ? "linear-gradient(to right, rgba(46,125,107,0.1) 50%, transparent 50%)"
            : "transparent";

          return (
            <div
              key={i}
              className="h-9 flex items-center justify-center"
              style={{ background: cellBg }}
            >
              <button
                onClick={() => handleDayClick(day)}
                disabled={isPast}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors"
                style={{
                  background: isStart || isEnd ? "var(--teal)" : "transparent",
                  color: isStart || isEnd
                    ? "white"
                    : isPast
                    ? "var(--ink-faint)"
                    : "var(--ink)",
                  fontWeight: isToday ? "700" : "400",
                  boxShadow: isToday && !isStart && !isEnd ? "0 0 0 1.5px var(--teal)" : "none",
                  cursor: isPast ? "not-allowed" : "pointer",
                  opacity: isPast ? 0.35 : 1,
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected dates summary */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex-1 text-center">
          <p className="text-xs mb-0.5" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            Departure
          </p>
          <p
            className="text-sm font-semibold"
            style={{
              color: startDate ? "var(--teal)" : "var(--rose)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {startDate ? fmtDate(startDate) : "Required"}
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border)", flexShrink: 0 }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <div className="flex-1 text-center">
          <p className="text-xs mb-0.5" style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}>
            Return
          </p>
          <p
            className="text-sm font-semibold"
            style={{
              color: endDate ? "var(--teal)" : "var(--ink-faint)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {endDate ? fmtDate(endDate) : "Optional"}
          </p>
        </div>
      </div>
    </div>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Date gate modal ──────────────────────────────────────────────────────────

function DateGateModal({
  start,
  end,
  onChangeStart,
  onChangeEnd,
  onConfirm,
  onSkip,
  saving,
  needsFlights,
  needsHotels,
}: {
  start: string;
  end: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  saving: boolean;
  needsFlights: boolean;
  needsHotels: boolean;
}) {
  const why = [needsFlights && "flight search", needsHotels && "hotel availability"]
    .filter(Boolean)
    .join(" and ");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(26,22,18,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onSkip}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-6 pb-8 max-w-sm mx-auto overflow-y-auto"
        style={{
          background: "var(--cream)",
          boxShadow: "0 -8px 40px rgba(26,22,18,0.18)",
          maxHeight: "90dvh",
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              When are you travelling?
            </p>
            <p className="text-sm" style={{ color: "var(--ink-muted)", fontFamily: "var(--font-dm-sans)" }}>
              Dates are required for {why}. You can change them later.
            </p>
          </div>

          <CalendarPicker
            startDate={start}
            endDate={end}
            onStartChange={onChangeStart}
            onEndChange={onChangeEnd}
          />

          <button
            onClick={onConfirm}
            disabled={!start || saving}
            className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: !start || saving ? "var(--border)" : "var(--burnt-orange)",
              color: !start || saving ? "var(--ink-muted)" : "var(--cream)",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: !start || saving ? "none" : "0 4px 16px rgba(184,92,26,0.24)",
            }}
          >
            {saving ? "Saving…" : "Confirm dates →"}
          </button>

          <button
            onClick={onSkip}
            className="text-center text-sm pb-1"
            style={{ color: "var(--ink-faint)", fontFamily: "var(--font-dm-sans)" }}
          >
            Skip for now — I'll set them later
          </button>
        </div>
      </div>
    </>
  );
}
