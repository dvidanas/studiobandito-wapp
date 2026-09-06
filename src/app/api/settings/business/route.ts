import { NextResponse } from "next/server";
import { getAllSettings, setSetting, getBusinessHours, setBusinessHours, getNegocio, updateNegocio } from "@/lib/db";
import { clientConfig } from "@/lib/client.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getAllSettings();
  const negocio = getNegocio();
  // `hours` se deriva de `disponibilidad`, la única fuente de verdad de
  // horarios. No hay ninguna clave de settings que guarde lo mismo en
  // paralelo — ese fue el error que se arrastró en Bandito. Ver CLAUDE.md.
  const { hours, editable, profesionalesActivos } = getBusinessHours();
  return NextResponse.json({
    business_name: negocio?.nombre ?? s.business_name ?? clientConfig.nombre,
    business_description: s.business_description ?? clientConfig.descripcion,
    address: negocio?.direccion ?? s.address ?? clientConfig.direccion,
    phone: negocio?.whatsapp ?? s.phone ?? clientConfig.whatsapp,
    hours,
    hours_editable: editable,
    profesionales_activos: profesionalesActivos,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (typeof body.business_name === "string") {
    setSetting("business_name", body.business_name.trim());
    updateNegocio({ nombre: body.business_name.trim() });
  }
  if (typeof body.business_description === "string") {
    setSetting("business_description", body.business_description.trim());
  }
  if (typeof body.address === "string") {
    setSetting("address", body.address.trim());
    updateNegocio({ direccion: body.address.trim() });
  }
  if (typeof body.phone === "string") {
    setSetting("phone", body.phone.trim());
    updateNegocio({ whatsapp: body.phone.trim() });
  }

  if (body.hours && typeof body.hours === "object") {
    const result = setBusinessHours(body.hours);
    if (!result.ok) {
      // 409 = hay más de un profesional activo y esta vista es de solo lectura.
      // 400 = algún día vino con un horario inválido.
      return NextResponse.json(
        { error: result.error, dias_invalidos: result.dias ?? null },
        { status: result.status }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
