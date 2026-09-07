import { NextResponse } from "next/server";
import { getClientes, searchClientes, findOrCreateCliente } from "@/lib/db";
import { normalizarTelefonoAR } from "@/lib/telefono";

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
  // Alta manual de staff: no se rechaza, pero se guarda limpio si el
  // teléfono cargado ya es un AR válido — mismo criterio que /api/citas.
  const telefono = normalizarTelefonoAR(body.telefono ?? "") ?? (body.telefono?.trim() || null);
  const id = findOrCreateCliente(body.nombre.trim(), telefono);
  return NextResponse.json({ ok: true, id });
}
