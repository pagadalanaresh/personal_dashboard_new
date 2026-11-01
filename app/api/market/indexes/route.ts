import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider, MARKET_INDEXES } from "@/lib/market-data";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getMarketDataProvider();
  const quotes = await provider.getQuotes(MARKET_INDEXES.map((index) => index.symbol));
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

  const indexes = MARKET_INDEXES.map((index) => {
    const quote = quoteBySymbol.get(index.symbol);
    return {
      symbol: index.symbol,
      name: index.name,
      price: quote?.price ?? null,
      change: quote?.change ?? null,
      changePercent: quote?.changePercent ?? null,
    };
  });

  return NextResponse.json({ indexes });
}
