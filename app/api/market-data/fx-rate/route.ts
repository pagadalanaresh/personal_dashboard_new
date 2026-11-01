import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/market-data";

const FX_CACHE_TTL_MS = 5 * 60 * 1000;
let fxCache: { rate: number; expiresAt: number } | null = null;

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pair = searchParams.get("pair");
  if (pair !== "USDINR") {
    return NextResponse.json({ error: "Unsupported currency pair" }, { status: 400 });
  }

  if (fxCache && fxCache.expiresAt > Date.now()) {
    return NextResponse.json({ rate: fxCache.rate, pair, updatedAt: fxCache.expiresAt - FX_CACHE_TTL_MS });
  }

  const provider = getMarketDataProvider();
  try {
    const quote = await provider.getQuote("USDINR=X");
    fxCache = { rate: quote.price, expiresAt: Date.now() + FX_CACHE_TTL_MS };
    return NextResponse.json({ rate: quote.price, pair, updatedAt: Date.now() });
  } catch (error) {
    console.error("fx-rate: Yahoo Finance quote failed", error);
    // Serve a stale cached rate rather than fail outright — a slightly old
    // FX rate beats no rate (and matches market-data.ts's own rule that a
    // failed live-data call must never break the app).
    if (fxCache) {
      return NextResponse.json({ rate: fxCache.rate, pair, updatedAt: fxCache.expiresAt - FX_CACHE_TTL_MS, stale: true });
    }
    return NextResponse.json({ error: "FX rate unavailable" }, { status: 503 });
  }
}
