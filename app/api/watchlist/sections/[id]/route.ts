import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { watchlistSectionSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = watchlistSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.watchlistSection.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const nameTaken = await prisma.watchlistSection.findUnique({
    where: {
      userId_name_market: {
        userId: session.userId,
        name: parsed.data.name,
        market: existing.market,
      },
    },
  });
  if (nameTaken && nameTaken.id !== id) {
    return NextResponse.json(
      { error: `You already have a section named "${parsed.data.name}"` },
      { status: 409 }
    );
  }

  const section = await prisma.watchlistSection.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ section });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.watchlistSection.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  // Items in this section aren't deleted — the relation's onDelete: SetNull
  // moves them back to "No section" automatically.
  await prisma.watchlistSection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
