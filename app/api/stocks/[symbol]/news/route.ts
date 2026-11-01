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
  const decodedSymbol = decodeURIComponent(symbol);
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";
  const provider = getMarketDataProvider();

  let companyName = searchParams.get("name");
  if (!companyName) {
    const details = await provider.getStockDetails(decodedSymbol, market);
    companyName = details?.name ?? decodedSymbol;
  }

  const articles = await provider.getNews(decodedSymbol, companyName, market);
  return NextResponse.json({ articles });
}
