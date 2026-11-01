import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const [holdings, watchlistItems] = await Promise.all([
    prisma.holding.findMany({
      where: { userId: session.userId, market },
      select: { symbol: true, name: true },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: session.userId, market },
      select: { symbol: true, name: true },
    }),
  ]);

  // Holdings + watchlist, deduped by symbol — this is "all the stocks" the
  // user is tracking, not a global news firehose.
  const bySymbol = new Map<string, string>();
  for (const item of [...holdings, ...watchlistItems]) {
    if (!bySymbol.has(item.symbol)) bySymbol.set(item.symbol, item.name);
  }

  if (bySymbol.size === 0) {
    return NextResponse.json({ articles: [] });
  }

  const provider = getMarketDataProvider();
  const results = await Promise.all(
    Array.from(bySymbol, async ([symbol, name]) => {
      const articles = await provider.getNews(symbol, name, market);
      return articles.map((article) => ({ ...article, symbol, companyName: name }));
    })
  );

  const articles = results
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({ articles });
}
