import { NextResponse } from "next/server";
import { listSucursales } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listSucursales(true));
}
