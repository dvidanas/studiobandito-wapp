import { NextRequest, NextResponse } from "next/server";
import { updateAppointment } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  const id = Number(appointmentId);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { resource_id, date, time_start, duration_minutes, service, notes, contact_name, contact_phone } = body;

  if (!resource_id || !date || !time_start || !duration_minutes) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  updateAppointment(id, {
    resource_id: Number(resource_id),
    service: typeof service === "string" ? service : null,
    date: date as string,
    time_start: time_start as string,
    duration_minutes: Number(duration_minutes),
    notes: typeof notes === "string" ? notes : null,
    contact_name: typeof contact_name === "string" ? contact_name : null,
    contact_phone: typeof contact_phone === "string" ? contact_phone : null,
  });

  return NextResponse.json({ ok: true });
}
