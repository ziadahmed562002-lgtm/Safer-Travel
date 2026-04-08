import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VIATOR_BASE = "https://api.viator.com/partner";

const VIATOR_HEADERS = {
  "exp-api-key": process.env.VIATOR_API_KEY ?? "",
  "Accept-Language": "en-US",
  Accept: "application/json;version=2.0",
  "Content-Type": "application/json",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDuration(d: {
  fixedDurationInMinutes?: number;
  variableDurationFromMinutes?: number;
  variableDurationToMinutes?: number;
} | undefined): string {
  if (!d) return "";
  if (d.fixedDurationInMinutes) {
    const mins = d.fixedDurationInMinutes;
    if (mins < 60) return `${mins} min`;
    const h = mins / 60;
    const rounded = Math.round(h * 2) / 2;
    return `${rounded} hour${rounded !== 1 ? "s" : ""}`;
  }
  if (d.variableDurationFromMinutes && d.variableDurationToMinutes) {
    const from = Math.round(d.variableDurationFromMinutes / 60);
    const to = Math.round(d.variableDurationToMinutes / 60);
    if (from === to) return `${from} hour${from !== 1 ? "s" : ""}`;
    return `${from}–${to} hours`;
  }
  return "";
}

function pickPhoto(images: { isCover?: boolean; variants?: { url: string; width: number }[] }[]): string | null {
  const cover = images.find((img) => img.isCover) ?? images[0];
  if (!cover?.variants?.length) return null;
  // pick variant closest to 800px wide
  const sorted = [...cover.variants].sort(
    (a, b) => Math.abs(a.width - 800) - Math.abs(b.width - 800)
  );
  return sorted[0]?.url ?? null;
}

async function getViatorDestId(destName: string): Promise<string | null> {
  try {
    const res = await fetch(`${VIATOR_BASE}/taxonomy/destinations`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      console.error("[experiences] taxonomy fetch failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const destinations: { destinationId: number; destinationName: string; destinationType?: string }[] =
      data.destinations ?? [];

    const nameL = destName.toLowerCase();

    // Prefer exact CITY match, then any name overlap
    const match =
      destinations.find(
        (d) =>
          d.destinationType === "CITY" &&
          d.destinationName.toLowerCase() === nameL
      ) ??
      destinations.find(
        (d) =>
          d.destinationType === "CITY" &&
          d.destinationName.toLowerCase().includes(nameL)
      ) ??
      destinations.find((d) => d.destinationName.toLowerCase().includes(nameL)) ??
      destinations.find((d) => nameL.includes(d.destinationName.toLowerCase()));

    return match ? String(match.destinationId) : null;
  } catch (err) {
    console.error("[experiences] taxonomy error:", err);
    return null;
  }
}

// ── route ─────────────────────────────────────────────────────────────────────

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

  // ── 1. Load trip ────────────────────────────────────────────────────────────
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, organizer_id, selected_destination, start_date, end_date")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = trip as any;
  const dest = t.selected_destination as { name: string; country?: string } | null;

  if (!dest?.name) {
    return Response.json({ error: "No destination selected for this trip" }, { status: 400 });
  }

  console.log("[experiences] destination:", dest.name);

  // ── 2. Look up Viator destination ID ───────────────────────────────────────
  const destId = await getViatorDestId(dest.name);
  console.log("[experiences] Viator destId:", destId);

  if (!destId) {
    return Response.json(
      { error: `Could not find Viator destination for "${dest.name}"` },
      { status: 404 }
    );
  }

  // ── 3. Search Viator products ──────────────────────────────────────────────
  const searchBody = {
    filtering: {
      destination: destId,
    },
    sorting: {
      sort: "TRAVELER_RATING",
      order: "DESCENDING",
    },
    pagination: {
      start: 1,
      count: 6,
    },
    currency: "USD",
  };

  try {
    const searchRes = await fetch(`${VIATOR_BASE}/products/search`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("[experiences] product search failed:", searchRes.status, errText);
      return Response.json({ error: "Could not fetch experiences from Viator" }, { status: 502 });
    }

    const searchData = await searchRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products: any[] = searchData.products ?? [];

    console.log("[experiences] Viator returned", products.length, "products");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recommendations = products.slice(0, 6).map((p: any) => ({
      title: p.title as string,
      description: (p.description as string | undefined) ?? "",
      price: (p.pricing?.summary?.fromPrice as number | null) ?? null,
      currency: "USD",
      duration: formatDuration(p.duration),
      photoURL: pickPhoto(p.images ?? []),
      productCode: p.productCode as string,
      webURL: p.productUrl as string,
    }));

    return Response.json({ destination: dest.name, recommendations });
  } catch (err) {
    console.error("[experiences] Viator search error:", err);
    return Response.json({ error: "Could not fetch experiences" }, { status: 500 });
  }
}
