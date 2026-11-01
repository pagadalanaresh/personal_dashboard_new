import { NextResponse } from "next/server";
import { exitImpersonation } from "@/lib/auth";

export async function POST() {
  try {
    await exitImpersonation();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No admin session to return to" }, { status: 400 });
  }
}
