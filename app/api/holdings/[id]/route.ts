import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { holdingSchema } from "@/lib/validations";
import { enrichHoldings } from "@/lib/holdings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = holdingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.holding.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }
  if (existing.market !== parsed.data.market) {
    return NextResponse.json({ error: "A holding's market can't be changed" }, { status: 400 });
  }

  const { buyDate, ...holdingFields } = parsed.data;
  const holding = await prisma.holding.update({
    where: { id },
    data: { ...holdingFields, ...(buyDate ? { createdAt: buyDate } : {}) },
  });

  const [enriched] = await enrichHoldings([holding]);
  return NextResponse.json({ holding: enriched });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.holding.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  await prisma.holding.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
