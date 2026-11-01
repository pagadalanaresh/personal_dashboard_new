import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

// Full-account backup: every holding, transaction, watchlist section and
// watchlist item for this user, across both markets — not scoped to
// whichever market the UI happens to be viewing. Watchlist items reference
// their section by name rather than id, since the id is meaningless once
// re-imported into a (possibly different) database.
export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.userId;

  const [user, holdings, transactions, watchlistSections, watchlistItems] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.holding.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.watchlistSection.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const sectionNameById = new Map(watchlistSections.map((s) => [s.id, s.name]));

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { name: user?.name ?? null, email: user?.email ?? null },
    holdings: holdings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      avgCostBasis: h.avgCostBasis,
      position: h.position,
      market: h.market,
      notes: h.notes,
      createdAt: h.createdAt,
    })),
    transactions: transactions.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      position: t.position,
      market: t.market,
      date: t.date,
      notes: t.notes,
    })),
    watchlistSections: watchlistSections.map((s) => ({
      name: s.name,
      market: s.market,
      sortOrder: s.sortOrder,
    })),
    watchlistItems: watchlistItems.map((i) => ({
      symbol: i.symbol,
      name: i.name,
      buyPrice: i.buyPrice,
      targetPrice: i.targetPrice,
      stopLoss: i.stopLoss,
      position: i.position,
      market: i.market,
      notes: i.notes,
      section: i.sectionId ? sectionNameById.get(i.sectionId) ?? null : null,
    })),
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="wealthfolio-backup-${payload.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
