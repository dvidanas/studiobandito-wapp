import { NextResponse, type NextRequest } from "next/server";
import {
  getConversationById,
  getMessages,
  insertMessage,
  updateMessageWaId,
} from "@/lib/db";
import { sendTextMessage } from "@/lib/ycloud/client";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const convo = getConversationById(id);
  if (!convo) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }
  const messages = getMessages(id);
  return NextResponse.json(messages);
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

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
  }

  const messageId = insertMessage(convo.id, "human", content, null);

  try {
    const { wa_message_id } = await sendTextMessage(convo.phone, content);
    updateMessageWaId(messageId, wa_message_id);
    return NextResponse.json({ ok: true, messageId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const is24hError =
      message.includes("131047") ||
      message.toLowerCase().includes("24");
    return NextResponse.json(
      { ok: false, messageId, error: message, is24hError },
      { status: 502 }
    );
  }
}
