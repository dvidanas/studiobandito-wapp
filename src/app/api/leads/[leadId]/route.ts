import { NextResponse, type NextRequest } from "next/server";
import {
  getLeadById,
  getConversationById,
  getRecentHistory,
  updateLead,
  deleteLead,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const id = parseInt(leadId, 10);
  if (isNaN(id)) return new NextResponse("bad id", { status: 400 });

  const lead = getLeadById(id);
  if (!lead) return new NextResponse("not found", { status: 404 });

  const conversation = getConversationById(lead.conversation_id);
  const messages = getRecentHistory(lead.conversation_id, 20).map((m) => ({
    role: m.role,
    content: m.content,
    created_at: m.created_at,
  }));

  return NextResponse.json({ lead, conversation, messages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const id = parseInt(leadId, 10);
  if (isNaN(id)) return new NextResponse("bad id", { status: 400 });

  const body = await req.json();
  const allowed = ["name", "business", "problem", "status", "notes"];
  const fields: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) fields[key] = body[key];
  }

  updateLead(id, fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const id = parseInt(leadId, 10);
  if (isNaN(id)) return new NextResponse("bad id", { status: 400 });

  deleteLead(id);
  return NextResponse.json({ ok: true });
}
