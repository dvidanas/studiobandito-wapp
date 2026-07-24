import { NextRequest, NextResponse } from "next/server";
import {
  listAppointments,
  createAppointment,
  getAppointmentStats,
  listResources,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;

  const appointments = listAppointments(from, to);
  const stats = getAppointmentStats();
  const resources = listResources();

  return NextResponse.json({ appointments, stats, resources });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { resource_id, date, time_start, duration_minutes, service, notes, contact_name, contact_phone, conversation_id, source } = body;

  if (!resource_id || !date || !time_start || !duration_minutes) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  let resolvedSource: "manual" | "bot" | "web" = "manual";
  if (source === "manual" || source === "bot" || source === "web") {
    resolvedSource = source;
  } else {
    const origin = req.headers.get("origin");
    if (origin && !origin.includes("studiobanditobot.feer.com.ar")) {
      resolvedSource = "web";
    }
  }

  const id = createAppointment({
    resource_id: Number(resource_id),
    conversation_id: conversation_id ? Number(conversation_id) : null,
    service: typeof service === "string" ? service : null,
    date: date as string,
    time_start: time_start as string,
    duration_minutes: Number(duration_minutes),
    notes: typeof notes === "string" ? notes : null,
    contact_name: typeof contact_name === "string" ? contact_name : null,
    contact_phone: typeof contact_phone === "string" ? contact_phone : null,
    source: resolvedSource,
  });

  return NextResponse.json({ id }, { status: 201 });
}
