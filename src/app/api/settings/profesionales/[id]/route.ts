import { NextResponse } from "next/server";
import {
  updateProfesional,
  deleteProfesional,
  getDisponibilidad,
  setDisponibilidad,
  setServiciosDeProfesional,
  getServiciosDeProfesional,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    disponibilidad: getDisponibilidad(Number(id)),
    servicios: getServiciosDeProfesional(Number(id)),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  updateProfesional(Number(id), {
    ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
    ...(body.telefono !== undefined && { telefono: body.telefono?.trim() || null }),
    ...(body.sucursal_id !== undefined && { sucursal_id: body.sucursal_id ? Number(body.sucursal_id) : null }),
    ...(body.activo !== undefined && { activo: Number(body.activo) }),
  });

  if (Array.isArray(body.servicios)) {
    setServiciosDeProfesional(Number(id), body.servicios.map(Number));
  }

  if (Array.isArray(body.disponibilidad)) {
    // La validación completa (formato + techo del negocio) vive en
    // setDisponibilidad, para que sea la misma se entre por donde se entre.
    // Acá solo se traduce el resultado a HTTP.
    const res = setDisponibilidad(Number(id), body.disponibilidad);
    if (!res.ok) {
      return NextResponse.json(
        { error: res.error, rechazadas: res.rechazadas },
        { status: res.status }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = deleteProfesional(Number(id));
  // Con citas cargadas se desactiva en lugar de borrarse: borrarlo rompería
  // el histórico de comisiones y caja.
  return NextResponse.json({ ok: true, aviso: res.error ?? null });
}
