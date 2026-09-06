import { NextResponse } from "next/server";
import { updateServicio, deleteServicio } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  if (body.duracion_min !== undefined && Number(body.duracion_min) <= 0) {
    return NextResponse.json({ error: "La duración tiene que ser mayor a cero." }, { status: 400 });
  }

  updateServicio(Number(id), {
    ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
    ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
    ...(body.duracion_min !== undefined && { duracion_min: Number(body.duracion_min) }),
    ...(body.precio !== undefined && { precio: Number(body.precio) }),
    ...(body.activo !== undefined && { activo: Number(body.activo) }),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = deleteServicio(Number(id));
  return NextResponse.json({ ok: true, aviso: res.error ?? null });
}
