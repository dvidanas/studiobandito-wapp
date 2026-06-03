import { NextResponse } from "next/server";
import { getDb, listResources } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare<[], { date: string }>(
      "SELECT DISTINCT date FROM blocked_slots WHERE time_start = '00:00' AND time_end = '23:59' ORDER BY date ASC"
    )
    .all();
  return NextResponse.json(rows.map((r) => r.date));
}

export async function POST(req: Request) {
  const { date } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "fecha inválida" }, { status: 400 });

  const db = getDb();
  const resources = listResources();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO blocked_slots (resource_id, date, time_start, time_end, reason) VALUES (?, ?, '00:00', '23:59', 'closed')"
  );
  for (const r of resources) insert.run(r.id, date);
  return NextResponse.json({ ok: true });
}
