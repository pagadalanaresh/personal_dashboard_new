import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { watchlistSchema } from "@/lib/validations";
import { enrichWatchlistItems } from "@/lib/watchlist";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = watchlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.watchlistItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Watchlist item not found" }, { status: 404 });
  }
  if (existing.market !== parsed.data.market) {
    return NextResponse.json({ error: "A watchlist item's market can't be changed" }, { status: 400 });
  }

  if (parsed.data.sectionId) {
    const section = await prisma.watchlistSection.findUnique({
      where: { id: parsed.data.sectionId },
    });
    if (!section || section.userId !== session.userId || section.market !== parsed.data.market) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
  }

  const item = await prisma.watchlistItem.update({
    where: { id },
    data: {
      name: parsed.data.name,
      buyPrice: parsed.data.buyPrice ?? null,
      targetPrice: parsed.data.targetPrice ?? null,
      stopLoss: parsed.data.stopLoss ?? null,
      position: parsed.data.position,
      sectionId: parsed.data.sectionId,
      notes: parsed.data.notes || null,
    },
  });

  const [enriched] = await enrichWatchlistItems([item]);
  return NextResponse.json({ item: enriched });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.watchlistItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Watchlist item not found" }, { status: 404 });
  }

  await prisma.watchlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
