import { NextResponse } from "next/server";
import { getAllSettings, setSetting, getBusinessHours, setBusinessHours } from "@/lib/db";
import { clientConfig } from "@/lib/client.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getAllSettings();
  // `hours` se deriva de availability_slots, NO de settings.hours (clave muerta:
  // solo alimentaba el prompt del bot y nunca afectó los turnos). Ver CLAUDE.md.
  const { hours, resourceCount, editable, collapsedDays } = getBusinessHours();
  return NextResponse.json({
    business_name: s.business_name ?? clientConfig.businessName ?? "",
    business_description: s.business_description ?? clientConfig.businessDescription ?? "",
    address: s.address ?? clientConfig.address ?? "",
    phone: s.phone ?? clientConfig.phone ?? "",
    hours,
    hours_editable: editable,
    hours_resource_count: resourceCount,
    hours_collapsed_days: collapsedDays,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (typeof body.business_name === "string") setSetting("business_name", body.business_name.trim());
  if (typeof body.business_description === "string") setSetting("business_description", body.business_description.trim());
  if (typeof body.address === "string") setSetting("address", body.address.trim());
  if (typeof body.phone === "string") setSetting("phone", body.phone.trim());

  if (body.hours && typeof body.hours === "object") {
    const result = setBusinessHours(body.hours);
    if (!result.ok) {
      // 409 = conflicto de modelo (varias personas activas); 400 = datos inválidos.
      return NextResponse.json(
        { error: result.error, resource_count: result.resourceCount, invalid_days: result.invalidDays },
        { status: result.invalidDays?.length ? 400 : 409 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
