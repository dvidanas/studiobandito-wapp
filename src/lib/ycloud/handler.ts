import {
  wasMessageProcessed,
  markMessageProcessed,
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  updateMessageWaId,
  getRecentHistory,
  createLead,
  updateLead,
  setConversationHasLead,
  getLeadByConversationId,
} from "@/lib/db";
import { getChatCompletion, type ChatMessage } from "@/lib/gemini";
import { sendTextMessage } from "./client";
import { clientConfig } from "@/lib/client.config";

const DELAY = clientConfig.responseDelayMs ?? 8000;

const INTENT_KEYWORDS = [
  "presupuesto", "precio", "cuánto", "cuanto", "contratar", "contrataría",
  "quiero", "necesito", "me interesa", "interesado", "interesada",
  "cotizar", "cotización", "consulta", "información", "info",
  "servicio", "servicios", "página web", "pagina web", "bot", "sistema",
  "reunión", "reunion", "hablar", "llamar",
];

const NOT_A_NAME = [
  "gracias", "ok", "si", "no", "dale", "bueno", "listo",
  "perfecto", "genial", "bien", "claro", "obvio", "nada",
  "hola", "chau", "adios", "jaja", "jeje", "oka", "okey",
  "entendido", "de nada", "por favor", "porfa", "este",
  "ese", "eso", "acá", "ahi", "ahí", "ya", "igual",
  "después", "despues", "ahora", "luego", "mañana",
];

const NAME_ASK_KEYWORDS = [
  "nombre", "llamás", "llamas", "identificarte", "cómo te", "como te",
];

// Timers de debounce por conversation_id
const pendingResponses = new Map<number, ReturnType<typeof setTimeout>>();

function hasLeadIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isRealName(name: string | null): boolean {
  if (!name) return false;
  return !/^\+?[\d\s\-()+]+$/.test(name);
}

function looksLikeName(text: string, lastBotMessage: string | null): boolean {
  if (!lastBotMessage) return false;
  const lastLower = lastBotMessage.toLowerCase();
  if (!NAME_ASK_KEYWORDS.some((kw) => lastLower.includes(kw))) return false;

  const t = text.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (/[0-9]/.test(t)) return false;
  if (/[?!]/.test(t)) return false;
  if (NOT_A_NAME.includes(t.toLowerCase())) return false;
  if (hasLeadIntent(t)) return false;
  return true;
}

async function sendDebouncedReply(convoId: number, phone: string): Promise<void> {
  pendingResponses.delete(convoId);

  // Re-leer modo por si cambió mientras esperábamos
  const fresh = getConversationById(convoId);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[wh] modo ${fresh?.mode ?? "?"} — sin respuesta automática`);
    return;
  }

  // Re-leer historial completo (pueden haber llegado mensajes nuevos)
  const history = getRecentHistory(convoId, 20);
  const chatHistory: ChatMessage[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const t0 = Date.now();
  let rawReply: string;
  try {
    rawReply = await getChatCompletion(chatHistory);
  } catch (err) {
    console.error(`[wh] error llamando a Gemini para +${phone}:`, err);
    return;
  }
  console.log(`[wh] LLM en ${Date.now() - t0}ms`);

  if (!rawReply) {
    console.warn("[wh] Gemini devolvió respuesta vacía");
    return;
  }

  const reply = rawReply.replace(/\n+/g, " ").trim();

  const messageId = insertMessage(convoId, "assistant", reply, null);

  try {
    const { wa_message_id } = await sendTextMessage(phone, reply);
    updateMessageWaId(messageId, wa_message_id);
    console.log(`[wh] → enviado a +${phone}`);
  } catch (err) {
    console.error(`[wh] error al enviar a +${phone}:`, err);
  }
}

export async function processWebhookPayload(payload: unknown): Promise<void> {
  const p = payload as Record<string, unknown>;
  const type = p?.type;

  if (type === "whatsapp.message.updated") {
    console.log("[webhook] status update, ignorando");
    return;
  }

  if (type === "whatsapp.inbound_message.received") {
    const msg = p?.whatsappInboundMessage as Record<string, unknown> | undefined;
    if (msg) await handleIncomingMessage(msg);
    return;
  }

  console.log(`[webhook] evento no manejado: ${type}`);
}

async function handleIncomingMessage(
  msg: Record<string, unknown>
): Promise<void> {
  // 1. Solo mensajes de texto
  if (msg.type !== "text") {
    console.log(`[wh] tipo no soportado: ${msg.type}, ignorando`);
    return;
  }

  const waId = msg.id as string;
  const text = (msg.text as Record<string, string>)?.body;
  const rawPhone = msg.from as string;
  const senderName = (msg.senderName as string) ?? null;

  if (!waId || !text || !rawPhone) {
    console.warn("[wh] mensaje incompleto, ignorando", msg);
    return;
  }

  // 2. Deduplicación
  if (wasMessageProcessed(waId)) {
    console.log(`[wh] duplicado ${waId}, ignorando`);
    return;
  }

  // 3. Marcar procesado ANTES de continuar
  markMessageProcessed(waId);

  // 4. Normalizar teléfono (sin '+')
  const phone = rawPhone.startsWith("+") ? rawPhone.slice(1) : rawPhone;

  console.log(`[wh] ← de +${phone}: "${text.slice(0, 60)}"`);

  // 5. Conversación
  const convo = getOrCreateConversation(phone, senderName);

  // 6. Guardar mensaje del usuario
  insertMessage(convo.id, "user", text, waId);

  // 7. Obtener historial (incluye el mensaje recién insertado)
  const history = getRecentHistory(convo.id, 20);
  const lastBotMessage =
    [...history].reverse().find((m) => m.role === "assistant")?.content ?? null;

  // 8. Captura de lead por intención real
  if (!convo.has_lead && hasLeadIntent(text)) {
    const existingLead = getLeadByConversationId(convo.id);
    if (!existingLead) {
      createLead(convo.id, convo.phone, convo.name);
      setConversationHasLead(convo.id, 1);
      console.log(`[lead] capturado por intención de +${phone} (${convo.name ?? "sin nombre"})`);
    }
  }

  // 9. Si ya hay lead y el mensaje parece un nombre, actualizar
  if (convo.has_lead && looksLikeName(text, lastBotMessage)) {
    const lead = getLeadByConversationId(convo.id);
    if (lead && !isRealName(lead.name)) {
      updateLead(lead.id, { name: text.trim() });
      console.log(`[lead] nombre actualizado → ${text.trim()}`);
    }
  }

  // 10. Verificar modo AI antes de programar respuesta
  const fresh = getConversationById(convo.id);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[wh] modo ${fresh?.mode ?? "?"} — sin respuesta automática`);
    return;
  }

  // 11. Debounce: cancelar timer anterior y programar uno nuevo
  const existing = pendingResponses.get(convo.id);
  if (existing) {
    clearTimeout(existing);
    console.log(`[wh] timer reiniciado para +${phone}`);
  }

  pendingResponses.set(
    convo.id,
    setTimeout(() => {
      sendDebouncedReply(convo.id, phone).catch((err) =>
        console.error(`[wh] error en sendDebouncedReply para +${phone}:`, err)
      );
    }, DELAY)
  );

  console.log(`[wh] respuesta programada en ${DELAY}ms para +${phone}`);
}
