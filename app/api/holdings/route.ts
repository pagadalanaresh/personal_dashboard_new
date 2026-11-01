import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { holdingSchema } from "@/lib/validations";
import { enrichHoldings } from "@/lib/holdings";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const holdings = await prisma.holding.findMany({
    where: { userId: session.userId, market },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ holdings: await enrichHoldings(holdings) });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = holdingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.holding.findUnique({
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
      { error: `You already have a holding for ${parsed.data.symbol}. Edit it instead.` },
      { status: 409 }
    );
  }

  const { buyDate, ...holdingFields } = parsed.data;
  const holding = await prisma.holding.create({
    data: { ...holdingFields, userId: session.userId, createdAt: buyDate },
  });

  // Seed a matching transaction so this holding is transaction-backed from
  // creation — logging a real trade later will recompute against this too.
  await prisma.transaction.create({
    data: {
      userId: session.userId,
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      type: "BUY",
      quantity: parsed.data.quantity,
      price: parsed.data.avgCostBasis,
      position: parsed.data.position,
      market: parsed.data.market,
      date: buyDate,
    },
  });

  const [enriched] = await enrichHoldings([holding]);
  return NextResponse.json({ holding: enriched }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Provide a non-empty array of holding ids" }, { status: 400 });
  }

  const { count } = await prisma.holding.deleteMany({
    where: { id: { in: ids }, userId: session.userId },
  });
  return NextResponse.json({ ok: true, deletedCount: count });
}
