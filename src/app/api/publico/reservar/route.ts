import { NextRequest, NextResponse } from "next/server";
import { createCita } from "@/lib/db";
import { hasValidSession } from "@/lib/auth";
import { normalizarTelefonoAR, ERROR_TELEFONO_INVALIDO } from "@/lib/telefono";

export const dynamic = "force-dynamic";

/**
 * Reserva desde la landing. `createCita` revalida todo del lado del servidor
 * —que el profesional haga el servicio, que la franja entre en su horario y
 * que no se solape con otra cita— dentro de una transacción. Lo que llegue en
 * el body es una intención, no un hecho.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

  const { servicio_id, profesional_id, fecha, hora_inicio, nombre, telefono } = body;

  if (!servicio_id || !profesional_id || !fecha || !hora_inicio) {
    return NextResponse.json(
      { error: "Faltan datos: servicio, profesional, fecha y horario son obligatorios." },
      { status: 400 }
    );
  }
  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Necesitamos tu nombre para agendar el turno." }, { status: 400 });
  }

  // El teléfono es el único canal para confirmar la reserva, así que el
  // público no puede mandar cualquier texto. El staff cargando a mano (mismo
  // endpoint, sesión logueada) sigue sin esta restricción — mismo criterio
  // que 034_pastalovers. Si igual limpia a un AR válido, se usa la versión
  // limpia para no generar una ficha de cliente duplicada sin necesidad.
  const staff = hasValidSession(req);
  const telefonoLimpio = normalizarTelefonoAR(telefono ?? "");
  if (!staff && !telefonoLimpio) {
    return NextResponse.json({ error: ERROR_TELEFONO_INVALIDO }, { status: 400 });
  }
  const telefonoGuardado = telefonoLimpio ?? (telefono?.trim() || null);

  const resultado = createCita({
    servicio_id: Number(servicio_id),
    profesional_id: Number(profesional_id),
    sucursal_id: body.sucursal_id ? Number(body.sucursal_id) : null,
    fecha,
    hora_inicio,
    cliente_nombre: nombre.trim(),
    cliente_telefono: telefonoGuardado,
    codigo_descuento: body.codigo_descuento?.trim() || null,
    notas: body.notas?.trim() || null,
    origen: "web",
  });

  if (!resultado.ok) {
    // 409: el horario se ocupó entre que se mostró y se confirmó.
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id: resultado.id, precio_final: resultado.precioFinal });
}
