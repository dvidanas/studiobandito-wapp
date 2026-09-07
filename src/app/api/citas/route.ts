import { NextResponse } from "next/server";
import {
  listCitas,
  createCita,
  getEstadisticasCitas,
  listProfesionales,
  listServicios,
  hoyEnArgentina,
} from "@/lib/db";
import { normalizarTelefonoAR } from "@/lib/telefono";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hoy = hoyEnArgentina();
  const desde = searchParams.get("desde") ?? hoy;
  const hasta = searchParams.get("hasta") ?? desde;

  return NextResponse.json({
    citas: listCitas(desde, hasta),
    stats: getEstadisticasCitas(),
    profesionales: listProfesionales(),
    servicios: listServicios(),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  if (!body.profesional_id || !body.servicio_id || !body.fecha || !body.hora_inicio) {
    return NextResponse.json(
      { error: "Faltan profesional, servicio, fecha u hora." },
      { status: 400 }
    );
  }

  const resultado = createCita({
    profesional_id: Number(body.profesional_id),
    servicio_id: Number(body.servicio_id),
    sucursal_id: body.sucursal_id ? Number(body.sucursal_id) : null,
    fecha: body.fecha,
    hora_inicio: body.hora_inicio,
    cliente_id: body.cliente_id ? Number(body.cliente_id) : null,
    cliente_nombre: body.cliente_nombre?.trim() || null,
    // Carga manual de staff: no se rechaza un teléfono raro (puede ser un
    // fijo, un número extranjero, o completarse después), pero si limpia a
    // un AR válido se guarda ya limpio — mismo criterio que
    // 034_pastalovers, para no generar una ficha de cliente duplicada.
    cliente_telefono: normalizarTelefonoAR(body.cliente_telefono ?? "") ?? (body.cliente_telefono?.trim() || null),
    codigo_descuento: body.codigo_descuento?.trim() || null,
    notas: body.notas?.trim() || null,
    origen: "manual",
  });

  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 409 });
  return NextResponse.json({ ok: true, id: resultado.id, precio_final: resultado.precioFinal });
}
