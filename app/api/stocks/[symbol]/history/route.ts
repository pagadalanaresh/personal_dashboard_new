import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider, type HistoryRange } from "@/lib/market-data";

const VALID_RANGES: HistoryRange[] = ["1D", "1W", "1M", "1Y"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "1M";
  const range = (VALID_RANGES.includes(rangeParam as HistoryRange)
    ? rangeParam
    : "1M") as HistoryRange;

  const provider = getMarketDataProvider();
  const points = await provider.getHistory(decodeURIComponent(symbol), range);

  return NextResponse.json({ points });
}
