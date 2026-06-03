import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  getDb()
    .prepare("DELETE FROM blocked_slots WHERE date = ? AND time_start = '00:00' AND time_end = '23:59'")
    .run(date);
  return NextResponse.json({ ok: true });
}
