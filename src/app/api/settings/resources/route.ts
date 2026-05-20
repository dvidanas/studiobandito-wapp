import { NextResponse } from "next/server";
import { listAllResources, createResource } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listAllResources());
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const id = createResource(body.name.trim(), body.phone ?? null);
  return NextResponse.json({ id });
}
