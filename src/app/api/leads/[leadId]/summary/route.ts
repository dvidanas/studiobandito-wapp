import { NextResponse, type NextRequest } from "next/server";
import { getLeadById, getRecentHistory, updateLeadSummary } from "@/lib/db";
import { getRawCompletion } from "@/lib/gemini";

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

  if (lead.summary) {
    try {
      return NextResponse.json(JSON.parse(lead.summary));
    } catch {
      // JSON inválido — regenerar
    }
  }

  const messages = getRecentHistory(lead.conversation_id, 20);
  if (messages.length === 0) {
    return new NextResponse("sin mensajes", { status: 422 });
  }

  const convoText = messages
    .map((m) => `${m.role === "user" ? "Cliente" : "Asistente"}: ${m.content}`)
    .join("\n");

  const prompt = `Analizá esta conversación de WhatsApp entre un potencial cliente y un asistente virtual de una agencia digital.
Respondé SOLO con un JSON con esta estructura, sin texto extra ni bloques de código:
{
  "resumen": "descripción en 2 líneas de qué quiere el cliente",
  "interes": "qué servicio o producto le interesa",
  "temperatura": "frio | tibio | caliente",
  "siguiente_paso": "qué debería hacer el equipo de ventas"
}
Conversación:
${convoText}`;

  let raw: string;
  try {
    raw = await getRawCompletion(prompt);
  } catch {
    return new NextResponse("error al llamar a Gemini", { status: 502 });
  }

  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return new NextResponse("respuesta no parseable", { status: 502 });
  }

  updateLeadSummary(id, JSON.stringify(parsed));
  return NextResponse.json(parsed);
}
