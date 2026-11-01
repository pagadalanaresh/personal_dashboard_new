import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  const market = searchParams.get("market") === "US" ? "US" : "NSE";
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol query param" }, { status: 400 });
  }

  const provider = getMarketDataProvider();
  const result = await provider.lookupSymbol(symbol, market);
  if (!result) {
    return NextResponse.json({ error: `Couldn't find "${symbol}"` }, { status: 404 });
  }

  return NextResponse.json({ result });
}
