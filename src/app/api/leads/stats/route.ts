import { NextResponse } from "next/server";
import { getLeadStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getLeadStats();
  return NextResponse.json(stats);
}
