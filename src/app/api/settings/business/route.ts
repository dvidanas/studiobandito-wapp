import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { clientConfig } from "@/lib/client.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getAllSettings();
  return NextResponse.json({
    business_name: s.business_name ?? clientConfig.businessName ?? "",
    business_description: s.business_description ?? clientConfig.businessDescription ?? "",
    address: s.address ?? clientConfig.address ?? "",
    phone: s.phone ?? clientConfig.phone ?? "",
    hours: s.hours ? JSON.parse(s.hours) : clientConfig.hours,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (typeof body.business_name === "string") setSetting("business_name", body.business_name.trim());
  if (typeof body.business_description === "string") setSetting("business_description", body.business_description.trim());
  if (typeof body.address === "string") setSetting("address", body.address.trim());
  if (typeof body.phone === "string") setSetting("phone", body.phone.trim());
  if (body.hours && typeof body.hours === "object") setSetting("hours", JSON.stringify(body.hours));
  return NextResponse.json({ ok: true });
}
