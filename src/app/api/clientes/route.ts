import { NextResponse } from "next/server";
import { getClientes, searchClientes, findOrCreateCliente } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  return NextResponse.json(q ? searchClientes(q) : getClientes());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const id = findOrCreateCliente(body.nombre.trim(), body.telefono?.trim() || null);
  return NextResponse.json({ ok: true, id });
}
