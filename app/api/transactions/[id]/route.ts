import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { recomputeHoldingFromTransactions, toTransactionDto } from "@/lib/transactions";
import { notesSchema } from "@/lib/validations";

// Transactions are otherwise immutable once logged — this is a narrow
// exception that only ever touches the `notes` annotation, never the
// quantity/price/date that Holdings and Closed Positions are derived from.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: { notes: parsed.data.notes || null },
  });

  return NextResponse.json({ transaction: toTransactionDto(transaction) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });
  await recomputeHoldingFromTransactions(session.userId, existing.symbol, existing.name, existing.market);

  return NextResponse.json({ ok: true });
}
