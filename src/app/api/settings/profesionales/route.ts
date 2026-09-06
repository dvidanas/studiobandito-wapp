import { NextResponse } from "next/server";
import { listProfesionales, createProfesional, setServiciosDeProfesional, getServiciosDeProfesional, getDisponibilidad } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const profesionales = listProfesionales(true);
  return NextResponse.json(
    // La disponibilidad viaja acá para que la pantalla de horarios pueda
    // dibujar la grilla completa con un solo pedido, en vez de uno por persona.
    profesionales.map((p) => ({
      ...p,
      servicios: getServiciosDeProfesional(p.id),
      disponibilidad: getDisponibilidad(p.id),
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const id = createProfesional({
    nombre: body.nombre.trim(),
    sucursal_id: body.sucursal_id ? Number(body.sucursal_id) : null,
    telefono: body.telefono?.trim() || null,
  });
  if (Array.isArray(body.servicios)) {
    setServiciosDeProfesional(id, body.servicios.map(Number));
  }
  return NextResponse.json({ ok: true, id });
}
