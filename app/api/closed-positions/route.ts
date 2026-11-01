import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getClosedPositions } from "@/lib/closed-positions";
import { deleteTransactionsAndRecompute } from "@/lib/transactions";

export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") === "US" ? "US" : "NSE";

  const positions = await getClosedPositions(session.userId, market);
  return NextResponse.json({ positions });
}

export async function DELETE(request: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const transactionIds = body?.transactionIds;
  if (
    !Array.isArray(transactionIds) ||
    transactionIds.length === 0 ||
    !transactionIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "Provide a non-empty array of transaction ids" },
      { status: 400 }
    );
  }

  await deleteTransactionsAndRecompute(session.userId, transactionIds);
  return NextResponse.json({ ok: true });
}
