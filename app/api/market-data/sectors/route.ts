import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  const market = searchParams.get("market") === "US" ? "US" : "NSE";
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols query param" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const provider = getMarketDataProvider();
  const sectors = await provider.getSectors(symbols, market);
  return NextResponse.json({ sectors });
}
