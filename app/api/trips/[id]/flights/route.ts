import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

type DuffelSegment = {
  departing_at: string;
  arriving_at: string;
  origin: { iata_code: string; name: string };
  destination: { iata_code: string; name: string };
  operating_carrier?: { name: string; iata_code: string };
  marketing_carrier?: { name: string; iata_code: string };
  operating_carrier_flight_number?: string;
  stops?: unknown[];
};

type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: Array<{
    duration: string;
    segments: DuffelSegment[];
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  // ── 1. Load trip ─────────────────────────────────────────────────────────
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, name, start_date, end_date, selected_destination")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dest = (trip as any).selected_destination as {
    name: string;
    country: string;
    description?: string;
  } | null;

  if (!dest) {
    return Response.json({ error: "No destination selected for this trip" }, { status: 400 });
  }

  // ── 2. Load member preferences (departure cities) ─────────────────────────
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("user_id, departure_city, profiles(name)")
    .eq("trip_id", id)
    .not("completed_at", "is", null);

  if (!preferences || preferences.length === 0) {
    return Response.json({ error: "No member preferences found" }, { status: 400 });
  }

  // Group members by departure city
  const cityMembers: Record<string, string[]> = {};
  for (const p of preferences) {
    if (!p.departure_city) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = Array.isArray(p.profiles) ? (p.profiles as any[])[0] : p.profiles;
    const name = (profile?.name as string) ?? "Member";
    if (!cityMembers[p.departure_city]) cityMembers[p.departure_city] = [];
    cityMembers[p.departure_city].push(name);
  }

  const departureCities = Object.keys(cityMembers);
  if (departureCities.length === 0) {
    return Response.json({ error: "No departure cities in member preferences" }, { status: 400 });
  }

  // ── 3. Map city names → IATA codes via Claude ────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const allCities = [...departureCities, dest.name];

  let iataMap: Record<string, string> = {};
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Map each city/destination name to the IATA code of the nearest large international airport. Return ONLY a JSON object, no markdown, no explanation. Format: {"City Name": "AAA"}
Cities: ${JSON.stringify(allCities)}`,
      }],
    });
    const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    iataMap = JSON.parse(cleaned);
    console.log("[flights] IATA map:", iataMap);
  } catch (err) {
    console.error("[flights] IATA mapping failed:", err);
    return Response.json({ error: "Failed to map cities to airports" }, { status: 500 });
  }

  const destIATA = iataMap[dest.name];
  if (!destIATA) {
    return Response.json({ error: `Could not find airport code for ${dest.name}` }, { status: 400 });
  }

  // ── 4. Determine travel dates ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = trip as any;
  const departureDate: string =
    t.start_date ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const returnDate: string | null = t.end_date ?? null;

  // ── 5. Search Duffel for each departure city in parallel ─────────────────
  const searchResults = await Promise.all(
    departureCities.map(async (city) => {
      const originIATA = iataMap[city];
      if (!originIATA) {
        return {
          city,
          origin_iata: null,
          members: cityMembers[city],
          offers: [],
          error: `No airport found for ${city}`,
        };
      }

      const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
        { origin: originIATA, destination: destIATA, departure_date: departureDate },
      ];
      if (returnDate) {
        slices.push({ origin: destIATA, destination: originIATA, departure_date: returnDate });
      }

      try {
        const res = await fetch(
          "https://api.duffel.com/air/offer_requests?return_offers=true",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
              "Duffel-Version": "v2",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              data: {
                slices,
                passengers: [{ type: "adult" }],
                cabin_class: "economy",
              },
            }),
          }
        );

        if (!res.ok) {
          const errBody = await res.text();
          console.error(`[flights] Duffel error for ${city} (${originIATA}→${destIATA}):`, errBody.slice(0, 300));
          return {
            city,
            origin_iata: originIATA,
            members: cityMembers[city],
            offers: [],
            error: `Search failed (${res.status})`,
          };
        }

        const json = await res.json();
        const rawOffers: DuffelOffer[] = json.data?.offers ?? [];
        console.log(`[flights] ${city}: ${rawOffers.length} offers`);

        // Sort by price and take top 5
        const sorted = [...rawOffers]
          .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
          .slice(0, 5);

        const offers = sorted.map((offer) => ({
          id: offer.id,
          total_amount: offer.total_amount,
          total_currency: offer.total_currency,
          slices: offer.slices.map((slice) => ({
            duration: slice.duration,
            segments: slice.segments.map((seg) => ({
              departing_at: seg.departing_at,
              arriving_at: seg.arriving_at,
              origin: { iata_code: seg.origin.iata_code, name: seg.origin.name },
              destination: { iata_code: seg.destination.iata_code, name: seg.destination.name },
              airline:
                seg.operating_carrier?.name ??
                seg.marketing_carrier?.name ??
                "Unknown Airline",
              flight_number: seg.operating_carrier_flight_number
                ? `${seg.operating_carrier?.iata_code ?? ""}${seg.operating_carrier_flight_number}`
                : null,
              stops: seg.stops?.length ?? 0,
            })),
          })),
        }));

        return { city, origin_iata: originIATA, members: cityMembers[city], offers, error: null };
      } catch (err) {
        console.error(`[flights] Network error for ${city}:`, err);
        return {
          city,
          origin_iata: originIATA,
          members: cityMembers[city],
          offers: [],
          error: "Network error — please try again",
        };
      }
    })
  );

  return Response.json({
    destination: dest.name,
    destination_iata: destIATA,
    departure_date: departureDate,
    return_date: returnDate,
    results: searchResults,
  });
}
