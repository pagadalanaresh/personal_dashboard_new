import "server-only";
import type { Holding } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMarketDataProvider } from "@/lib/market-data";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type EnrichedHolding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCostBasis: number;
  position: "SHORT" | "LONG";
  market: "NSE" | "US";
  notes: string | null;
  createdAt: Date;
  price: number;
  previousClose: number;
  marketValue: number;
  costBasisTotal: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
};

export async function enrichHoldings(holdings: Holding[]): Promise<EnrichedHolding[]> {
  if (holdings.length === 0) return [];

  const provider = getMarketDataProvider();
  const quotes = await provider.getQuotes(holdings.map((h) => h.symbol));
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  // Shares bought today weren't part of your portfolio at yesterday's
  // close, so previousClose isn't a valid day-change baseline for them —
  // it'd count the stock's whole-day move (including before you bought)
  // as "today's change" for shares you only just added, overstating it.
  // Pull today's buys per symbol so each portion of a position (held
  // since yesterday vs. bought today) can use its own real baseline.
  const todaysBuys = await prisma.transaction.findMany({
    where: {
      userId: holdings[0].userId,
      type: "BUY",
      date: { gte: startOfDay(new Date()) },
      OR: holdings.map((h) => ({ symbol: h.symbol, market: h.market })),
    },
  });
  const todaysBuysByKey = new Map<string, { quantity: number; price: number }[]>();
  for (const tx of todaysBuys) {
    const key = `${tx.symbol}:${tx.market}`;
    const list = todaysBuysByKey.get(key) ?? [];
    list.push({ quantity: tx.quantity, price: tx.price });
    todaysBuysByKey.set(key, list);
  }

  return holdings.map((holding) => {
    const quote = quoteBySymbol.get(holding.symbol);
    const price = quote?.price ?? holding.avgCostBasis;
    const previousClose = quote?.previousClose ?? price;
    const marketValue = price * holding.quantity;
    const costBasisTotal = holding.avgCostBasis * holding.quantity;
    const gainLoss = marketValue - costBasisTotal;
    const gainLossPercent = costBasisTotal === 0 ? 0 : (gainLoss / costBasisTotal) * 100;

    const buysToday = todaysBuysByKey.get(`${holding.symbol}:${holding.market}`) ?? [];
    const qtyBoughtToday = Math.min(
      holding.quantity,
      buysToday.reduce((sum, b) => sum + b.quantity, 0)
    );
    const qtyHeldBeforeToday = holding.quantity - qtyBoughtToday;
    const costOfTodaysBuys = buysToday.reduce((sum, b) => sum + b.quantity * b.price, 0);
    const totalBoughtTodayQty = buysToday.reduce((sum, b) => sum + b.quantity, 0);
    const avgPriceToday = totalBoughtTodayQty === 0 ? price : costOfTodaysBuys / totalBoughtTodayQty;

    const dayBaselineTotal = previousClose * qtyHeldBeforeToday + avgPriceToday * qtyBoughtToday;
    const dayChange = marketValue - dayBaselineTotal;
    const dayChangePercent =
      dayBaselineTotal === 0 ? 0 : (dayChange / dayBaselineTotal) * 100;

    return {
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      avgCostBasis: holding.avgCostBasis,
      position: holding.position,
      market: holding.market,
      notes: holding.notes,
      createdAt: holding.createdAt,
      price,
      previousClose,
      marketValue,
      costBasisTotal,
      gainLoss,
      gainLossPercent,
      dayChange,
      dayChangePercent,
    };
  });
}
