import { NextResponse } from "next/server";
import { listClosedDates, addClosedDate } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listClosedDates());
}

export async function POST(req: Request) {
  const { date } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
  addClosedDate(date);
  return NextResponse.json({ ok: true });
}
