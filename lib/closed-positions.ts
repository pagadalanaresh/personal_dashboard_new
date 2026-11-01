import "server-only";
import { prisma } from "@/lib/prisma";

const QUANTITY_EPSILON = 1e-6;

export type ClosedPosition = {
  symbol: string;
  name: string;
  quantity: number;
  totalInvested: number;
  totalProceeds: number;
  realizedPL: number;
  realizedPLPercent: number;
  position: "SHORT" | "LONG";
  openDate: string;
  closeDate: string;
  // The transactions that make up this episode — deleting a closed position
  // means deleting these (there's no separate row for the episode itself).
  transactionIds: string[];
  // The transaction that closed the episode (the final zero-crossing sell) —
  // notes for a closed position live on this transaction, since there's no
  // separate row for the episode itself.
  closingTransactionId: string;
  notes: string | null;
};

// Closed positions aren't stored — they're derived from the same
// transaction ledger that drives open Holdings. Each symbol's history is
// segmented into "episodes" that start when quantity first leaves zero and
// end when it returns to zero. Every SELL within an episode — partial or
// final — emits its own closed-position entry for the quantity it sold,
// using the same weighted-average cost basis that recomputeHoldingFromTransactions
// uses for the open Holding, so a partial sell's realized P&L shows up
// immediately instead of waiting for the position to fully close.
export async function getClosedPositions(
  userId: string,
  market?: "NSE" | "US"
): Promise<ClosedPosition[]> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, ...(market ? { market } : {}) },
    orderBy: { date: "asc" },
  });

  const bySymbol = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = `${tx.symbol}:${tx.market}`;
    const list = bySymbol.get(key) ?? [];
    list.push(tx);
    bySymbol.set(key, list);
  }

  const closedPositions: ClosedPosition[] = [];

  for (const txs of bySymbol.values()) {
    const symbol = txs[0].symbol;
    let quantity = 0;
    let costBasisTotal = 0;
    let episodeStart: Date | null = null;
    let episodeTransactionIds: string[] = [];
    // The position type is set by whichever BUY opens the episode — a
    // partial add-on later in the same episode doesn't change it.
    let episodePosition: "SHORT" | "LONG" = "SHORT";
    let name = txs[0].name;

    for (const tx of txs) {
      if (episodeStart === null) episodePosition = tx.position;
      episodeStart ??= tx.date;
      name = tx.name;
      episodeTransactionIds.push(tx.id);

      if (tx.type === "BUY") {
        quantity += tx.quantity;
        costBasisTotal += tx.quantity * tx.price;
        continue;
      }

      // Selling realizes P&L on the sold shares at the current average
      // cost — it doesn't touch the avg cost basis of shares that remain.
      const avgCost = quantity > 0 ? costBasisTotal / quantity : 0;
      const costBasisSold = tx.quantity * avgCost;
      const proceeds = tx.quantity * tx.price;
      const realizedPL = proceeds - costBasisSold;

      quantity -= tx.quantity;
      costBasisTotal -= costBasisSold;

      const isFinalClose = Math.abs(quantity) < QUANTITY_EPSILON;

      closedPositions.push({
        symbol,
        name,
        quantity: tx.quantity,
        totalInvested: costBasisSold,
        totalProceeds: proceeds,
        realizedPL,
        realizedPLPercent: costBasisSold === 0 ? 0 : (realizedPL / costBasisSold) * 100,
        position: episodePosition,
        openDate: episodeStart.toISOString(),
        closeDate: tx.date.toISOString(),
        // A partial sell only undoes itself when deleted — the remaining
        // open quantity and its buys are untouched. The final sell of an
        // episode still deletes the whole round trip, as before.
        transactionIds: isFinalClose ? episodeTransactionIds : [tx.id],
        closingTransactionId: tx.id,
        notes: tx.notes,
      });

      if (isFinalClose) {
        quantity = 0;
        costBasisTotal = 0;
        episodeStart = null;
        episodeTransactionIds = [];
      }
    }
  }

  closedPositions.sort(
    (a, b) => new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
  );

  return closedPositions;
}
