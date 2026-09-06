import { NextResponse } from "next/server";
import { getCitaById, updateCita, deleteCita } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ citaId: string }> }) {
  const { citaId } = await params;
  const cita = getCitaById(Number(citaId));
  if (!cita) return NextResponse.json({ error: "No existe." }, { status: 404 });
  return NextResponse.json(cita);
}

export async function PUT(req: Request, { params }: { params: Promise<{ citaId: string }> }) {
  const { citaId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  const resultado = updateCita(Number(citaId), {
    ...(body.profesional_id !== undefined && { profesional_id: Number(body.profesional_id) }),
    ...(body.servicio_id !== undefined && { servicio_id: Number(body.servicio_id) }),
    ...(body.fecha !== undefined && { fecha: body.fecha }),
    ...(body.hora_inicio !== undefined && { hora_inicio: body.hora_inicio }),
    ...(body.notas !== undefined && { notas: body.notas }),
    ...(body.estado !== undefined && { estado: body.estado }),
  });

  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ citaId: string }> }) {
  const { citaId } = await params;
  deleteCita(Number(citaId));
  return NextResponse.json({ ok: true });
}
