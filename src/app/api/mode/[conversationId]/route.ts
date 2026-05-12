import { NextResponse, type NextRequest } from "next/server";
import { getConversationById, setMode } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const convo = getConversationById(id);
  if (!convo) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const { mode } = await req.json();
  if (mode !== "AI" && mode !== "HUMAN") {
    return NextResponse.json(
      { error: "Modo inválido. Usar 'AI' o 'HUMAN'" },
      { status: 400 }
    );
  }

  setMode(id, mode);
  return NextResponse.json({ ok: true, mode });
}
