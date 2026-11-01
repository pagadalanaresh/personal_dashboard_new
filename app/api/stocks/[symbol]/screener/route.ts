import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getScreenerData } from "@/lib/screener";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await params;
  const data = await getScreenerData(decodeURIComponent(symbol));
  if (!data) {
    return NextResponse.json(
      { error: "Fundamentals not available for this stock" },
      { status: 404 }
    );
  }
  return NextResponse.json(data);
}
