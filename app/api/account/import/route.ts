import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { accountImportSchema } from "@/lib/validations";

// Restores a full-account backup produced by GET /api/account/export into
// the signed-in user's account. Holdings/watchlist items upsert by their
// natural unique key (symbol+market) so re-importing the same file twice is
// idempotent. Transactions have no natural unique key, so exact-duplicate
// rows (same symbol/type/quantity/price/market/date) already present are
// skipped instead of piling up on repeat imports.
export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = accountImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That file doesn't look like a valid account backup" },
      { status: 400 }
    );
  }

  const { holdings, transactions, watchlistSections, watchlistItems } = parsed.data;
  const userId = session.userId;

  const existingTransactions = await prisma.transaction.findMany({ where: { userId } });
  const existingSignatures = new Set(
    existingTransactions.map(
      (t) => `${t.symbol}|${t.type}|${t.quantity}|${t.price}|${t.market}|${t.date.toISOString()}`
    )
  );
  const transactionsToCreate = transactions.filter((t) => {
    const date = t.date ?? new Date();
    return !existingSignatures.has(`${t.symbol}|${t.type}|${t.quantity}|${t.price}|${t.market}|${date.toISOString()}`);
  });

  const summary = await prisma.$transaction(async (tx) => {
    const sectionIdByKey = new Map<string, string>();

    for (const section of watchlistSections) {
      const existing = await tx.watchlistSection.findUnique({
        where: { userId_name_market: { userId, name: section.name, market: section.market } },
      });

      if (existing) {
        sectionIdByKey.set(`${section.name}|${section.market}`, existing.id);
        continue;
      }

      const last = await tx.watchlistSection.findFirst({
        where: { userId, market: section.market },
        orderBy: { sortOrder: "desc" },
      });
      const created = await tx.watchlistSection.create({
        data: {
          userId,
          name: section.name,
          market: section.market,
          sortOrder: section.sortOrder ?? (last?.sortOrder ?? -1) + 1,
        },
      });
      sectionIdByKey.set(`${section.name}|${section.market}`, created.id);
    }

    for (const holding of holdings) {
      await tx.holding.upsert({
        where: { userId_symbol_market: { userId, symbol: holding.symbol, market: holding.market } },
        update: {
          name: holding.name,
          quantity: holding.quantity,
          avgCostBasis: holding.avgCostBasis,
          position: holding.position,
          notes: holding.notes ?? null,
        },
        create: {
          userId,
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.quantity,
          avgCostBasis: holding.avgCostBasis,
          position: holding.position,
          market: holding.market,
          notes: holding.notes ?? null,
          createdAt: holding.createdAt ?? new Date(),
        },
      });
    }

    for (const item of watchlistItems) {
      const sectionId = item.section
        ? sectionIdByKey.get(`${item.section}|${item.market}`) ?? null
        : null;

      await tx.watchlistItem.upsert({
        where: { userId_symbol_market: { userId, symbol: item.symbol, market: item.market } },
        update: {
          name: item.name,
          buyPrice: item.buyPrice ?? null,
          targetPrice: item.targetPrice ?? null,
          stopLoss: item.stopLoss ?? null,
          position: item.position,
          notes: item.notes ?? null,
          sectionId,
        },
        create: {
          userId,
          symbol: item.symbol,
          name: item.name,
          buyPrice: item.buyPrice ?? null,
          targetPrice: item.targetPrice ?? null,
          stopLoss: item.stopLoss ?? null,
          position: item.position,
          market: item.market,
          notes: item.notes ?? null,
          sectionId,
        },
      });
    }

    if (transactionsToCreate.length > 0) {
      await tx.transaction.createMany({
        data: transactionsToCreate.map((t) => ({
          userId,
          symbol: t.symbol,
          name: t.name,
          type: t.type,
          quantity: t.quantity,
          price: t.price,
          position: t.position,
          market: t.market,
          date: t.date ?? new Date(),
          notes: t.notes ?? null,
        })),
      });
    }

    return {
      holdingsImported: holdings.length,
      watchlistSectionsImported: watchlistSections.length,
      watchlistItemsImported: watchlistItems.length,
      transactionsImported: transactionsToCreate.length,
      transactionsSkipped: transactions.length - transactionsToCreate.length,
    };
  });

  return NextResponse.json({ summary });
}
