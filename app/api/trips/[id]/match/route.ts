import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth — require the user's JWT passed as Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  // User-scoped client — for RLS-protected reads (preferences, destinations)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  // Service-role client — for server-side writes that need to bypass RLS.
  // Safe here because this is a server-only API route.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── 1. Fetch completed member preferences for this trip ──────────────────
  const { data: preferences, error: prefsError } = await supabase
    .from("user_preferences")
    .select("*, profiles(name)")
    .eq("trip_id", id)
    .not("completed_at", "is", null);

  console.log("[match] trip_id:", id);
  console.log("[match] preferences fetched:", preferences?.length ?? 0, prefsError ?? "no error");

  if (prefsError) {
    return Response.json({ error: prefsError.message }, { status: 500 });
  }
  if (!preferences || preferences.length === 0) {
    return Response.json(
      { error: "No completed preferences found for this trip" },
      { status: 400 }
    );
  }

  // ── 2. Fetch destinations table as "featured" suggestions ────────────────
  const { data: featuredDestinations, error: destError } = await supabase
    .from("destinations")
    .select("*");

  console.log("[match] featured destinations fetched:", featuredDestinations?.length ?? 0, destError ?? "no error");

  // ── 3. Build the prompt ──────────────────────────────────────────────────
  const memberProfiles = preferences.map((p, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = Array.isArray(p.profiles) ? (p.profiles as any[])[0] : p.profiles;
    return {
      name: (profile?.name as string) ?? `Traveler ${i + 1}`,
      travel_style: p.travel_style,
      budget_max: p.budget_max,
      trip_length: p.trip_length,
      flight_preference: p.flight_preference,
      hotel_preference: p.hotel_preference,
      amenities: p.amenities ?? [],
      departure_city: p.departure_city,
    };
  });

  const memberNames = memberProfiles.map((m) => m.name);

  const prefsBlock = memberProfiles
    .map(
      (m) => `**${m.name}**
  • Travel style: ${m.travel_style}
  • Budget max: $${m.budget_max?.toLocaleString() ?? "flexible"} per person
  • Trip length: ${m.trip_length?.replace("_", " ")}
  • Flights: ${m.flight_preference}
  • Hotel: ${m.hotel_preference}
  • Must-have amenities: ${m.amenities.length > 0 ? m.amenities.join(", ") : "none specified"}
  • Flying from: ${m.departure_city}`
    )
    .join("\n\n");

  const featuredBlock =
    featuredDestinations && featuredDestinations.length > 0
      ? featuredDestinations
          .map(
            (d) =>
              `- ${d.name}, ${d.country}: ${d.description} (tags: ${(d.tags as string[]).join(", ")})`
          )
          .join("\n")
      : "None available";

  const memberScoreFields = memberNames
    .map((name) => `"${name}": <integer 0-100, how well this destination fits this person>`)
    .join(",\n        ");

  const prompt = `You are a world-class travel advisor with encyclopedic knowledge of every destination on Earth — from iconic capitals to hidden gems in emerging regions. Your gift is finding the places where a group's seemingly different desires converge into something everyone genuinely loves.

## Group Members & Preferences

${prefsBlock}

## Featured Destinations (consider these, but do not limit yourself to them)

These are destinations we know about — treat them as inspiration, not constraints:

${featuredBlock}

---

## Your Task

You have complete freedom to recommend ANY destination in the world. Do not restrict yourself to the featured list above. Think across all continents, consider lesser-known gems, emerging destinations, and hidden jewels that perfectly suit this group.

Analyse this group with care:

1. **Style overlap** — Where do their travel styles naturally converge? Someone who craves culture and someone who wants luxury can both thrive in Marrakech's riads or Vienna's coffeehouse scene. Find places where different desires find genuine expression.

2. **Budget reality** — The binding constraint is the lowest budget: $${Math.min(...memberProfiles.map((m) => m.budget_max ?? 10000)).toLocaleString()} per person. Are there destinations — perhaps underrated or off-season — where everyone gets an exceptional experience within this?

3. **Amenity intersection** — Which destinations naturally cover the most must-haves across the group? Think creatively about how destinations satisfy multiple needs.

4. **Honest tradeoffs** — Some people will give something up. Name it warmly and specifically. But surface the unexpected delight — the adventure lover who discovers they're enchanted by Lisbon's hidden alleys, the beach lover who finds the thermal pools of the Azores more magical than any Caribbean resort.

5. **Flight practicality** — Consider which destinations are realistically accessible from ${memberProfiles.map((m) => m.departure_city).join(", ")} with reasonable connections and journey times.

6. **Think boldly** — Don't default to the obvious. If Georgia (the country), Faroe Islands, Uzbekistan, or Portuguese Alentejo is the right answer, say so. The best recommendation is the one that makes everyone say "I never would have thought of that, but yes."

Return ONLY valid JSON — no markdown fences, no explanation outside the JSON structure:

{
  "matches": [
    {
      "destination_id": "<exact UUID from the featured list if you are recommending one of those destinations, otherwise null>",
      "name": "<destination name, e.g. 'Tbilisi' or 'Alentejo'>",
      "country": "<country name>",
      "description": "<2-3 evocative sentences describing this destination — its character, what makes it special, what a visitor feels there>",
      "image_search_query": "<a vivid, specific search query someone would use to find beautiful travel photography of this place, e.g. 'Tbilisi old town aerial sunset Georgia'>",
      "tags": ["<3-6 single-word tags describing the vibe, e.g. culture, luxury, adventure, beaches, food, history>"],
      "ai_score": <number 0.0–10.0, one decimal place>,
      "match_explanation": "<2–3 sentences: why this destination works for THIS specific group, referencing their actual names and preferences — make it feel personal and specific>",
      "personality_scores": {
        ${memberScoreFields}
      },
      "compromise_notes": "<1–2 sentences: what each person gives up, and the unexpected delight they might discover — be specific, warm, and honest>"
    }
  ]
}

Return exactly 3 destinations ordered best to third-best. Prioritise genuine excitement and surprising fit over safe, predictable choices.`;

  // ── 4. Call Claude ───────────────────────────────────────────────────────
  console.log("API key prefix:", process.env.ANTHROPIC_API_KEY?.slice(0, 20));
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "Empty response from AI" }, { status: 500 });
    }
    rawText = textBlock.text;
    console.log("[match] AI raw response (first 300 chars):", rawText.slice(0, 300));
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? err.message : "AI request failed";
    console.error("[match] AI call failed:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }

  // ── 5. Parse AI response ─────────────────────────────────────────────────
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let matches: Array<{
    destination_id: string | null;
    name: string;
    country: string;
    description: string;
    image_search_query: string;
    tags: string[];
    ai_score: number;
    match_explanation: string;
    personality_scores: Record<string, number>;
    compromise_notes: string;
  }>;

  try {
    const parsed = JSON.parse(cleaned);
    matches = parsed.matches;
    if (!Array.isArray(matches) || matches.length === 0) throw new Error("No matches");
    console.log("[match] parsed matches:", matches.length, matches.map((m) => m.name));
  } catch {
    console.error("[match] JSON parse failed. Cleaned text:", cleaned.slice(0, 500));
    return Response.json(
      { error: "Failed to parse AI response", raw: cleaned.slice(0, 500) },
      { status: 500 }
    );
  }

  // ── 6. Persist to trip_shortlist ─────────────────────────────────────────
  // Use the service-role client so RLS policies don't block these writes.
  const { error: deleteError } = await supabaseAdmin
    .from("trip_shortlist")
    .delete()
    .eq("trip_id", id);

  if (deleteError) {
    console.error("[match] shortlist delete error:", deleteError.message, deleteError.code);
  } else {
    console.log("[match] shortlist cleared for trip:", id);
  }

  const shortlistRows = matches.map((m) => ({
    trip_id: id,
    destination_id: m.destination_id && m.destination_id !== "null" ? m.destination_id : null,
    ai_score: m.ai_score,
    match_explanation: m.match_explanation,
    personality_scores: {
      member_scores: m.personality_scores,
      compromise_notes: m.compromise_notes,
      // Inline destination details — used when destination_id is null
      destination_inline: {
        name: m.name,
        country: m.country,
        description: m.description,
        image_search_query: m.image_search_query,
        tags: m.tags,
      },
    },
  }));

  console.log("[match] inserting shortlist rows:", shortlistRows.length);

  const { error: saveError } = await supabaseAdmin
    .from("trip_shortlist")
    .insert(shortlistRows);

  if (saveError) {
    console.error("[match] shortlist insert error:", saveError.message, saveError.code, saveError.details);
    // Surface this as a real error so the client knows something went wrong
    return Response.json(
      { error: `Failed to save results: ${saveError.message}` },
      { status: 500 }
    );
  }

  console.log("[match] shortlist saved successfully");

  // ── 7. Return enriched results ───────────────────────────────────────────
  // Attach DB destination record if one was matched, otherwise use inline details
  const dbDestMap = new Map(
    (featuredDestinations ?? []).map((d) => [d.id, d])
  );

  const results = matches.map((m) => ({
    destination_id: m.destination_id,
    ai_score: m.ai_score,
    match_explanation: m.match_explanation,
    personality_scores: m.personality_scores,
    compromise_notes: m.compromise_notes,
    destination_inline: {
      name: m.name,
      country: m.country,
      description: m.description,
      image_search_query: m.image_search_query,
      tags: m.tags,
    },
    destination: m.destination_id ? (dbDestMap.get(m.destination_id) ?? null) : null,
  }));

  return Response.json({ results });
}
