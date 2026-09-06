import { NextResponse } from "next/server";
import { listLeads, getLeadStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const leads = listLeads();
  const stats = getLeadStats();
  return NextResponse.json({ leads, stats });
}
