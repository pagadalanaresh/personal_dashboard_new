import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";
  const provider = getMarketDataProvider();
  const details = await provider.getStockDetails(decodeURIComponent(symbol), market);

  if (!details) {
    return NextResponse.json({ error: `Couldn't find "${symbol}"` }, { status: 404 });
  }

  return NextResponse.json({ details });
}
