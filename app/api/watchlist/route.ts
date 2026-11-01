import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { watchlistSchema } from "@/lib/validations";
import { enrichWatchlistItems } from "@/lib/watchlist";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.userId, market },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items: await enrichWatchlistItems(items) });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = watchlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: {
      userId_symbol_market: {
        userId: session.userId,
        symbol: parsed.data.symbol,
        market: parsed.data.market,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `${parsed.data.symbol} is already on your watchlist` },
      { status: 409 }
    );
  }

  if (parsed.data.sectionId) {
    const section = await prisma.watchlistSection.findUnique({
      where: { id: parsed.data.sectionId },
    });
    if (!section || section.userId !== session.userId || section.market !== parsed.data.market) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
  }

  const item = await prisma.watchlistItem.create({
    data: {
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      buyPrice: parsed.data.buyPrice ?? null,
      targetPrice: parsed.data.targetPrice ?? null,
      stopLoss: parsed.data.stopLoss ?? null,
      position: parsed.data.position,
      market: parsed.data.market,
      sectionId: parsed.data.sectionId,
      notes: parsed.data.notes || null,
      userId: session.userId,
    },
  });

  const [enriched] = await enrichWatchlistItems([item]);
  return NextResponse.json({ item: enriched }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Provide a non-empty array of item ids" }, { status: 400 });
  }

  const { count } = await prisma.watchlistItem.deleteMany({
    where: { id: { in: ids }, userId: session.userId },
  });
  return NextResponse.json({ ok: true, deletedCount: count });
}
