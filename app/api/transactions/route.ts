import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { transactionSchema } from "@/lib/validations";
import {
  deleteTransactionsAndRecompute,
  recomputeHoldingFromTransactions,
  toTransactionDto,
  validateSellQuantity,
} from "@/lib/transactions";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.userId, market },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ transactions: transactions.map(toTransactionDto) });
}

export async function POST(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { symbol, name, type, quantity, price, position, market, date } = parsed.data;

  if (type === "SELL") {
    const result = await validateSellQuantity(session.userId, symbol, quantity, market);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.userId,
      symbol,
      name,
      type,
      quantity,
      price,
      position,
      market,
      date: date ?? new Date(),
    },
  });

  await recomputeHoldingFromTransactions(session.userId, symbol, name, market);

  return NextResponse.json({ transaction: toTransactionDto(transaction) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Provide a non-empty array of transaction ids" }, { status: 400 });
  }

  const deletedCount = await deleteTransactionsAndRecompute(session.userId, ids);
  return NextResponse.json({ ok: true, deletedCount });
}
