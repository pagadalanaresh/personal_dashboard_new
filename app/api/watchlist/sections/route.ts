import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { watchlistSectionSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const sections = await prisma.watchlistSection.findMany({
    where: { userId: session.userId, market },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ sections });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = watchlistSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.watchlistSection.findUnique({
    where: {
      userId_name_market: {
        userId: session.userId,
        name: parsed.data.name,
        market: parsed.data.market,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `You already have a section named "${parsed.data.name}"` },
      { status: 409 }
    );
  }

  const last = await prisma.watchlistSection.findFirst({
    where: { userId: session.userId, market: parsed.data.market },
    orderBy: { sortOrder: "desc" },
  });

  const section = await prisma.watchlistSection.create({
    data: {
      name: parsed.data.name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      market: parsed.data.market,
      userId: session.userId,
    },
  });

  return NextResponse.json({ section }, { status: 201 });
}
