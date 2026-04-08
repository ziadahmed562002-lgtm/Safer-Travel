import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

const HOTELBEDS_BASE = "https://api.test.hotelbeds.com";

function hotelbedsHeaders() {
  const apiKey = process.env.HOTELBEDS_API_KEY!;
  const secret = process.env.HOTELBEDS_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHash("sha256")
    .update(apiKey + secret + timestamp)
    .digest("hex");

  return {
    "Api-Key": apiKey,
    "X-Signature": signature,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchByGeolocation(body: any): Promise<{ hotels: any[]; raw: any; status: number }> {
  const url = `${HOTELBEDS_BASE}/hotel-api/1.0/hotels`;
  console.log("[hotels] POST", url);
  console.log("[hotels] request body:", JSON.stringify(body));

  const res = await fetch(url, {
    method: "POST",
    headers: hotelbedsHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("[hotels] response status:", res.status);
  console.log("[hotels] response body (first 1000 chars):", text.slice(0, 1000));

  if (!res.ok) {
    return { hotels: [], raw: { error: text }, status: res.status };
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { hotels: [], raw: { parseError: text.slice(0, 200) }, status: res.status };
  }

  const hotels = json.hotels?.hotels ?? [];
  return { hotels, raw: json, status: res.status };
}

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
  const t = trip as any;
  const dest = t.selected_destination as { name: string; country: string } | null;

  if (!dest) {
    return Response.json({ error: "No destination selected for this trip" }, { status: 400 });
  }

  // ── 2. Get lat/lon from Claude ────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let lat: number;
  let lon: number;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [{
        role: "user",
        content: `Return ONLY a JSON object with the latitude and longitude of the city/island center of "${dest.name}${dest.country ? ", " + dest.country : ""}". Format: {"lat": 0.0, "lon": 0.0}`,
      }],
    });
    const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const coords = JSON.parse(cleaned);
    lat = coords.lat;
    lon = coords.lon;
    console.log("[hotels] coords for", dest.name, ":", lat, lon);
  } catch (err) {
    console.error("[hotels] lat/lon lookup failed:", err);
    return Response.json({ error: "Could not locate destination coordinates" }, { status: 500 });
  }

  if (!lat || !lon) {
    return Response.json({ error: `No coordinates found for ${dest.name}` }, { status: 400 });
  }

  // ── 3. Determine stay dates ───────────────────────────────────────────────
  const today = new Date();
  // Ensure check-in is always in the future
  const rawCheckIn = t.start_date
    ? new Date(t.start_date)
    : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const futureCheckIn = rawCheckIn < today
    ? new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    : rawCheckIn;

  const rawCheckOut = t.end_date
    ? new Date(t.end_date)
    : new Date(futureCheckIn.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Ensure check-out is at least 1 day after check-in
  const futureCheckOut = rawCheckOut <= futureCheckIn
    ? new Date(futureCheckIn.getTime() + 7 * 24 * 60 * 60 * 1000)
    : rawCheckOut;

  const checkIn = futureCheckIn.toISOString().split("T")[0];
  const checkOut = futureCheckOut.toISOString().split("T")[0];

  const nights = Math.max(
    1,
    Math.round((futureCheckOut.getTime() - futureCheckIn.getTime()) / (1000 * 60 * 60 * 24))
  );

  console.log("[hotels] destination:", dest.name, "| check-in:", checkIn, "| check-out:", checkOut, "| nights:", nights);

  const stayBlock = {
    stay: { checkIn, checkOut },
    occupancies: [{ rooms: 1, adults: 2, children: 0 }],
  };

  // ── 4. Search — try progressively wider radii ─────────────────────────────
  let rawHotels: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let searchError: string | null = null;

  for (const radius of [20, 50, 150]) {
    console.log(`[hotels] trying geolocation radius ${radius}km`);
    const { hotels, raw, status } = await searchByGeolocation({
      ...stayBlock,
      geolocation: { latitude: lat, longitude: lon, radius, unit: "km" },
      filter: { maxHotels: 10 },
    });

    if (status !== 200) {
      // Extract Hotelbeds error message if present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hbErrors: any[] = raw?.error?.errors ?? [];
      const hbMsg = hbErrors[0]?.description ?? `HTTP ${status}`;
      searchError = `Hotelbeds: ${hbMsg}`;
      console.error("[hotels] non-200 from Hotelbeds:", searchError);
      break; // Auth/format errors won't improve with wider radius
    }

    if (hotels.length > 0) {
      rawHotels = hotels;
      console.log(`[hotels] found ${hotels.length} hotels at radius ${radius}km`);
      break;
    }

    console.log(`[hotels] 0 results at ${radius}km, expanding...`);
  }

  // ── 5. Graceful test-mode fallback ────────────────────────────────────────
  // The Hotelbeds test environment has limited global coverage — small island
  // destinations often return 0 results even with a wide radius.
  if (rawHotels.length === 0 && !searchError) {
    console.log("[hotels] no results after all radii — returning test_mode_empty flag");
    return Response.json({
      destination: dest.name,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      hotels: [],
      test_mode_empty: true,
    });
  }

  if (searchError && rawHotels.length === 0) {
    return Response.json({ error: searchError }, { status: 502 });
  }

  // ── 6. Shape the response ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hotels = rawHotels.map((h: any) => {
    // One entry per distinct room name — cheapest rate wins
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomMap = new Map<string, { room_name: string; rate_key: string; net: number; payment_type: string; refundable: boolean }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (h.rooms as any[] | undefined) ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const rate of (r.rates as any[] | undefined) ?? []) {
        const net = parseFloat(rate.net ?? "0");
        const key = r.name as string;
        const existing = roomMap.get(key);
        if (!existing || net < existing.net) {
          roomMap.set(key, {
            room_name: key,
            rate_key: rate.rateKey as string,
            net,
            payment_type: rate.paymentType as string,
            refundable: rate.rateClass !== "NRF",
          });
        }
      }
    }
    const rooms = [...roomMap.values()].sort((a, b) => a.net - b.net);

    // Images — sorted by visual order, full GIATA URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = ((h.images as any[] | undefined) ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (a.visualOrder ?? 999) - (b.visualOrder ?? 999))
      .slice(0, 3)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((img: any) => `http://photos.hotelbeds.com/giata/bigger/${img.path}`);

    const stars = parseInt(h.categoryCode?.replace("EST", "") ?? "0") || 0;

    return {
      code: h.code as number,
      name: h.name as string,
      stars,
      category_name: h.categoryName as string,
      latitude: parseFloat(h.latitude ?? "0"),
      longitude: parseFloat(h.longitude ?? "0"),
      zone_name: h.zoneName as string | undefined,
      min_rate: parseFloat(h.minRate ?? "0"),
      currency: h.currency as string,
      nights,
      images,
      rooms,
    };
  });

  hotels.sort((a, b) => b.stars - a.stars || a.min_rate - b.min_rate);

  return Response.json({
    destination: dest.name,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    hotels,
    test_mode_empty: false,
  });
}
