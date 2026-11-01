import "server-only";
import type { WatchlistItem } from "@prisma/client";
import { getMarketDataProvider } from "@/lib/market-data";

// A watchlist item is "near target" once price is within this band of the
// target (either side) — close enough to be worth surfacing an alert.
const ALERT_BAND_PERCENT = 3;

export type EnrichedWatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  buyPrice: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
  position: "SHORT" | "LONG";
  market: "NSE" | "US";
  sectionId: string | null;
  notes: string | null;
  price: number;
  previousClose: number;
  changePercent: number;
  changeFromBuyPercent: number | null;
  distanceToTargetPercent: number | null;
  alert: "above" | "near" | "stop" | null;
};

function computeAlert(
  price: number,
  targetPrice: number | null,
  stopLoss: number | null
): { distanceToTargetPercent: number | null; alert: EnrichedWatchlistItem["alert"] } {
  const distanceToTargetPercent =
    targetPrice == null || targetPrice === 0 ? null : ((price - targetPrice) / targetPrice) * 100;

  // A stop-loss breach takes priority over target alerts — it's the more
  // urgent, risk-facing signal.
  if (stopLoss != null && stopLoss > 0 && price <= stopLoss) {
    return { distanceToTargetPercent, alert: "stop" };
  }
  if (targetPrice == null || targetPrice === 0 || distanceToTargetPercent == null) {
    return { distanceToTargetPercent: null, alert: null };
  }
  if (price >= targetPrice) {
    return { distanceToTargetPercent, alert: "above" };
  }
  if (Math.abs(distanceToTargetPercent) <= ALERT_BAND_PERCENT) {
    return { distanceToTargetPercent, alert: "near" };
  }
  return { distanceToTargetPercent, alert: null };
}

export async function enrichWatchlistItems(
  items: WatchlistItem[]
): Promise<EnrichedWatchlistItem[]> {
  if (items.length === 0) return [];

  const provider = getMarketDataProvider();
  const quotes = await provider.getQuotes(items.map((item) => item.symbol));
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return items.map((item) => {
    const quote = quoteBySymbol.get(item.symbol);
    const price = quote?.price ?? item.targetPrice ?? 0;
    const previousClose = quote?.previousClose ?? price;
    const changePercent = previousClose === 0 ? 0 : ((price - previousClose) / previousClose) * 100;
    const changeFromBuyPercent =
      item.buyPrice == null || item.buyPrice === 0
        ? null
        : ((price - item.buyPrice) / item.buyPrice) * 100;
    const { distanceToTargetPercent, alert } = computeAlert(price, item.targetPrice, item.stopLoss);

    return {
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      buyPrice: item.buyPrice,
      targetPrice: item.targetPrice,
      stopLoss: item.stopLoss,
      position: item.position,
      market: item.market,
      sectionId: item.sectionId,
      notes: item.notes,
      price,
      previousClose,
      changePercent,
      changeFromBuyPercent,
      distanceToTargetPercent,
      alert,
    };
  });
}
