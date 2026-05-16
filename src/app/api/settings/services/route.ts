import { NextResponse } from "next/server";
import { listServices, createService } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listServices(true));
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const id = createService({
    name: body.name.trim(),
    description: body.description?.trim() ?? null,
    price: body.price?.trim() ?? null,
    duration_minutes: Number(body.duration_minutes) || 30,
    active: 1,
  });
  return NextResponse.json({ id });
}
