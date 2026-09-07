import { NextResponse } from "next/server";
import { getClienteById, getHistorialCliente, updateCliente, deleteCliente } from "@/lib/db";
import { normalizarTelefonoAR } from "@/lib/telefono";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = await params;
  const cliente = getClienteById(Number(clienteId));
  if (!cliente) return NextResponse.json({ error: "No existe." }, { status: 404 });
  return NextResponse.json({ cliente, historial: getHistorialCliente(Number(clienteId)) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  updateCliente(Number(clienteId), {
    ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
    // Edición manual de staff: no se rechaza, pero se guarda limpio si el
    // teléfono cargado ya es un AR válido — mismo criterio que /api/citas.
    ...(body.telefono !== undefined && {
      telefono: normalizarTelefonoAR(body.telefono ?? "") ?? (body.telefono?.trim() || null),
    }),
    ...(body.email !== undefined && { email: body.email?.trim() || null }),
    ...(body.notas !== undefined && { notas: body.notas?.trim() || null }),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = await params;
  const resultado = deleteCliente(Number(clienteId));
  // 409: tiene turnos cargados — el mensaje ya explica cuántos, ver deleteCliente().
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
