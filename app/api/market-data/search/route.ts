import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const market = searchParams.get("market") === "US" ? "US" : "NSE";
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const provider = getMarketDataProvider();
  const results = await provider.searchSymbols(query, market);
  return NextResponse.json({ results });
}
