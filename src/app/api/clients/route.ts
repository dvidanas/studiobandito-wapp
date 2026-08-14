import { NextRequest, NextResponse } from "next/server";
import { getClients, searchClients, findOrCreateClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const clients = q ? searchClients(q) : getClients();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, phone } = body;
  if (!name || !phone || typeof name !== "string" || typeof phone !== "string") {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const id = findOrCreateClient(name, phone);
  return NextResponse.json({ id }, { status: 201 });
}
