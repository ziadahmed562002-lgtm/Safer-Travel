import { NextRequest } from "next/server";
import airports from "@/data/airports.json";

type Airport = {
  iata_code: string;
  name: string;
  city_name: string | null;
  country_name: string | null;
};

const AIRPORTS: Airport[] = airports as Airport[];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const trimmed = query.trim();
  if (trimmed.length < 1) {
    return Response.json({ data: [] });
  }

  const lower = trimmed.toLowerCase();
  const results = AIRPORTS.filter(
    (a) =>
      a.iata_code.toLowerCase().startsWith(lower) ||
      a.city_name?.toLowerCase().includes(lower) ||
      a.name.toLowerCase().includes(lower) ||
      a.country_name?.toLowerCase().includes(lower)
  ).slice(0, 6);

  return Response.json({ data: results });
}
