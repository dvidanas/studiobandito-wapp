import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getAllSettings();
  return NextResponse.json({
    business_name: s.business_name ?? "",
    business_description: s.business_description ?? "",
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (typeof body.business_name === "string") setSetting("business_name", body.business_name.trim());
  if (typeof body.business_description === "string") setSetting("business_description", body.business_description.trim());
  return NextResponse.json({ ok: true });
}
