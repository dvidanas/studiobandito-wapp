import { NextResponse } from "next/server";
import { listAllResources, createResource } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(listAllResources());
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const id = createResource(body.name.trim(), body.phone ?? null);
  return NextResponse.json({ id });
}
