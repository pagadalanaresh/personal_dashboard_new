import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols query param" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const provider = getMarketDataProvider();
  const quotes = await provider.getQuotes(symbols);
  return NextResponse.json({ quotes, asOf: Date.now() });
}
