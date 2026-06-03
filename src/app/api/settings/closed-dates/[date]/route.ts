import { NextResponse } from "next/server";
import { removeClosedDate } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  removeClosedDate(date);
  return NextResponse.json({ ok: true });
}
