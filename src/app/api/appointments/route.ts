import { NextRequest, NextResponse } from "next/server";
import { listProfesionales, listServicios, createCita } from "@/lib/db";
import { hasValidSession } from "@/lib/auth";
import { normalizarTelefonoAR, ERROR_TELEFONO_INVALIDO } from "@/lib/telefono";

export const dynamic = "force-dynamic";

/**
 * PUENTE DE COMPATIBILIDAD — ver el comentario en /api/settings/services.
 * La landing manda `service` (nombre, no id) y `resource_id` (siempre 1,
 * hardcodeado en App.jsx): acá se resuelve servicio_id matcheando el nombre
 * EXACTO contra el catálogo real. Siempre coincide porque el catálogo que ve
 * la landing sale de este mismo /api/settings/services, que expone `nombre`
 * tal cual. profesional_id se resuelve solo tomando a la única profesional
 * activa (Sol hoy).
 *
 * Si el día de mañana hay más de una profesional activa, este puente deja de
 * poder adivinar a quién asignarle el turno y devuelve 500 — hay que migrar
 * la landing a /api/publico/reservar (que sí pide profesional_id) antes de
 * sumar personal. Ver nota en CLAUDE.md.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { date, time_start, service, contact_name, contact_phone } = body;
  if (!date || !time_start || !service || !contact_name || !contact_phone) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const activos = listProfesionales();
  if (activos.length !== 1) {
    return NextResponse.json(
      { error: "No se pudo agendar automáticamente. Escribinos por WhatsApp para coordinar tu turno." },
      { status: 500 }
    );
  }

  const servicio = listServicios().find((s) => s.nombre === service);
  if (!servicio) {
    return NextResponse.json(
      { error: "Servicio no reconocido. Recargá la página e intentá de nuevo." },
      { status: 400 }
    );
  }

  // Mismo criterio que /api/publico/reservar y 034_pastalovers: el público
  // no puede mandar cualquier texto como teléfono, el staff logueado sí (usa
  // este mismo puente para probar la landing, por ejemplo).
  const staff = hasValidSession(req);
  const telefonoLimpio = normalizarTelefonoAR(contact_phone as string);
  if (!staff && !telefonoLimpio) {
    return NextResponse.json({ error: ERROR_TELEFONO_INVALIDO }, { status: 400 });
  }

  const resultado = createCita({
    profesional_id: activos[0].id,
    servicio_id: servicio.id,
    fecha: date as string,
    hora_inicio: time_start as string,
    cliente_nombre: contact_name as string,
    cliente_telefono: telefonoLimpio ?? (contact_phone as string),
    origen: "web",
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }

  return NextResponse.json({ id: resultado.id }, { status: 201 });
}
