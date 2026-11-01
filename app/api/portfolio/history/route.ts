import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider, type HistoryRange } from "@/lib/market-data";
import { mergeWeightedHistories } from "@/lib/portfolio-history";

const VALID_RANGES: HistoryRange[] = ["1D", "1W", "1M", "1Y"];

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "1M";
  const range = (VALID_RANGES.includes(rangeParam as HistoryRange)
    ? rangeParam
    : "1M") as HistoryRange;
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const holdings = await prisma.holding.findMany({ where: { userId: session.userId, market } });

  if (holdings.length === 0) {
    return NextResponse.json({ points: [] });
  }

  const provider = getMarketDataProvider();
  const series = await Promise.all(
    holdings.map(async (holding) => ({
      points: await provider.getHistory(holding.symbol, range),
      quantity: holding.quantity,
    }))
  );

  return NextResponse.json({ points: mergeWeightedHistories(series) });
}
