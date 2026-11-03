import type { TransactionDto } from "@/lib/transactions";

// Realized P&L per SELL transaction — a weighted-average-cost walk through
// each symbol's full chronological history, same logic as
// lib/closed-positions.ts (which is server-only and can't be imported from
// client components). Buys never realize P&L, so they're absent from the
// returned map; callers should fall back to the transaction's own total.
export function computeRealizedPLByTransaction(
  transactions: TransactionDto[]
): Map<string, number> {
  const bySymbol = new Map<string, TransactionDto[]>();
  for (const tx of transactions) {
    const list = bySymbol.get(tx.symbol) ?? [];
    list.push(tx);
    bySymbol.set(tx.symbol, list);
  }

  const result = new Map<string, number>();
  for (const txs of bySymbol.values()) {
    const sorted = [...txs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let quantity = 0;
    let costBasisTotal = 0;
    for (const tx of sorted) {
      if (tx.type === "BUY") {
        quantity += tx.quantity;
        costBasisTotal += tx.quantity * tx.price;
        continue;
      }
      const avgCost = quantity > 0 ? costBasisTotal / quantity : 0;
      const costBasisSold = tx.quantity * avgCost;
      const proceeds = tx.quantity * tx.price;
      result.set(tx.id, proceeds - costBasisSold);
      quantity -= tx.quantity;
      costBasisTotal -= costBasisSold;
    }
  }
  return result;
}
