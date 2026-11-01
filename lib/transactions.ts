import "server-only";
import type { Transaction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const QUANTITY_EPSILON = 1e-6;

export type TransactionDto = {
  id: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
  date: string;
  notes: string | null;
};

export function toTransactionDto(tx: Transaction): TransactionDto {
  return {
    id: tx.id,
    symbol: tx.symbol,
    name: tx.name,
    type: tx.type,
    quantity: tx.quantity,
    price: tx.price,
    total: Number((tx.quantity * tx.price).toFixed(2)),
    date: tx.date.toISOString(),
    notes: tx.notes,
  };
}

// Deletes any number of transactions (owned by userId) in one go, then
// recomputes the Holding for every distinct symbol touched — used by bulk
// delete on Transactions and by deleting a whole Closed Position episode.
export async function deleteTransactionsAndRecompute(userId: string, transactionIds: string[]) {
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, userId },
  });
  if (transactions.length === 0) return 0;

  await prisma.transaction.deleteMany({
    where: { id: { in: transactions.map((tx) => tx.id) }, userId },
  });

  const symbolKeys = new Map<string, { symbol: string; name: string; market: "NSE" | "US" }>();
  for (const tx of transactions) {
    symbolKeys.set(`${tx.symbol}:${tx.market}`, { symbol: tx.symbol, name: tx.name, market: tx.market });
  }

  await Promise.all(
    Array.from(symbolKeys.values(), ({ symbol, name, market }) =>
      recomputeHoldingFromTransactions(userId, symbol, name, market)
    )
  );

  return transactions.length;
}

// Single source of truth for a Holding's quantity/avgCostBasis: replays the
// full transaction ledger for (userId, symbol, market) rather than
// incrementally patching the Holding, so create/delete of any transaction
// in the history can never leave the Holding out of sync.
export async function recomputeHoldingFromTransactions(
  userId: string,
  symbol: string,
  name: string,
  market: "NSE" | "US" = "NSE"
) {
  const transactions = await prisma.transaction.findMany({
    where: { userId, symbol, market },
    orderBy: { date: "asc" },
  });

  let quantity = 0;
  let costBasisTotal = 0;

  for (const tx of transactions) {
    if (tx.type === "BUY") {
      quantity += tx.quantity;
      costBasisTotal += tx.quantity * tx.price;
    } else {
      // Selling reduces quantity at the current average cost — it doesn't
      // change the avg cost basis of the shares that remain.
      const avgCost = quantity > 0 ? costBasisTotal / quantity : 0;
      quantity -= tx.quantity;
      costBasisTotal -= tx.quantity * avgCost;
    }
  }

  if (quantity <= QUANTITY_EPSILON) {
    await prisma.holding.deleteMany({ where: { userId, symbol, market } });
    return null;
  }

  const avgCostBasis = costBasisTotal / quantity;
  return prisma.holding.upsert({
    where: { userId_symbol_market: { userId, symbol, market } },
    create: { userId, symbol, name, quantity, avgCostBasis, market },
    update: { quantity, avgCostBasis },
  });
}

export async function validateSellQuantity(
  userId: string,
  symbol: string,
  quantity: number,
  market: "NSE" | "US" = "NSE"
): Promise<{ valid: true } | { valid: false; error: string }> {
  const holding = await prisma.holding.findUnique({
    where: { userId_symbol_market: { userId, symbol, market } },
  });

  if (!holding || holding.quantity + QUANTITY_EPSILON < quantity) {
    const held = holding?.quantity ?? 0;
    return {
      valid: false,
      error: `You only hold ${held} share${held === 1 ? "" : "s"} of ${symbol}`,
    };
  }

  return { valid: true };
}
