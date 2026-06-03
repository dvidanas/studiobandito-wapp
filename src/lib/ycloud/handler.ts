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
  getNextAvailableSlots,
  getAvailableSlots,
  createAppointment,
  hasAppointmentForSlot,
  setMode,
  type AvailableSlot,
} from "@/lib/db";
import { getChatCompletion, getRawCompletion, type ChatMessage } from "@/lib/gemini";
import { sendTextMessage, markMessageRead } from "./client";
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

// Mensaje con contenido real: no es un saludo/aceptación de una sola palabra
function isEngagedMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (NOT_A_NAME.includes(t)) return false;
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  return wordCount >= 2 || t.length > 20;
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

  const engagedCount = history.filter(
    (m) => m.role === "user" && isEngagedMessage(m.content)
  ).length;

  // Disponibilidad de turnos si está habilitado
  const apptConfig = (clientConfig as Record<string, unknown>).appointments as
    | { enabled: boolean; defaultDuration: number }
    | undefined;
  let availabilityNote = "";
  let offeredSlots: Array<AvailableSlot & { date: string }> = [];
  if (apptConfig?.enabled) {
    offeredSlots = getNextAvailableSlots(3, apptConfig.defaultDuration ?? 30);
    if (offeredSlots.length > 0) {
      const slotList = offeredSlots
        .slice(0, 6)
        .map((s) => {
          const d = new Date(s.date + "T12:00:00");
          const dayName = d.toLocaleDateString("es-AR", { weekday: "long" });
          const [, month, day] = s.date.split("-");
          return `${dayName} ${day}/${month} a las ${s.time_start}`;
        })
        .join(", ");
      availabilityNote =
        ` DISPONIBILIDAD ACTUAL PARA TURNOS: ${slotList}. ` +
        "Si el usuario quiere un turno, podés ofrecerle estos horarios.";
    }
  }

  const extraInstruction = availabilityNote || undefined;

  const t0 = Date.now();
  let rawReply: string;
  try {
    rawReply = await getChatCompletion(chatHistory, extraInstruction);
  } catch (err) {
    console.error(`[wh] error llamando a Gemini para +${phone}:`, err);
    return;
  }
  console.log(`[wh] LLM en ${Date.now() - t0}ms`);

  if (!rawReply) {
    console.warn("[wh] Gemini devolvió respuesta vacía");
    return;
  }

  const rawTrimmed = rawReply.trim();

  // Derivar a humano si Gemini no sabe responder
  if (rawTrimmed.includes("[[DERIVAR_HUMANO]]")) {
    console.log(`[wh] derivando a humano para +${phone}`);
    setMode(convoId, "HUMAN");
    const fallback = "Disculpá, para esa consulta te paso con alguien del equipo. En un momento te atienden 🙏";
    const messageId = insertMessage(convoId, "assistant", fallback, null);
    try {
      const { wa_message_id } = await sendTextMessage(phone, fallback);
      updateMessageWaId(messageId, wa_message_id);
    } catch (err) {
      console.error(`[wh] error al enviar fallback a +${phone}:`, err);
    }
    return;
  }

  const reply = rawTrimmed.replace(/\n+/g, " ");

  const messageId = insertMessage(convoId, "assistant", reply, null);

  try {
    const { wa_message_id } = await sendTextMessage(phone, reply);
    updateMessageWaId(messageId, wa_message_id);
    console.log(`[wh] → enviado a +${phone}`);
  } catch (err) {
    console.error(`[wh] error al enviar a +${phone}:`, err);
  }

  // Intentar detectar si el usuario confirmó un turno
  if (apptConfig?.enabled && offeredSlots.length > 0) {
    tryBookAppointmentFromChat(convoId, phone, history, offeredSlots, apptConfig.defaultDuration ?? 30).catch(
      (err) => console.error("[appt] error en tryBookAppointmentFromChat:", err)
    );
  }
}

async function tryBookAppointmentFromChat(
  convoId: number,
  phone: string,
  history: { role: string; content: string }[],
  offeredSlots: Array<AvailableSlot & { date: string }>,
  defaultDuration: number
): Promise<void> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return;

  const slotList = offeredSlots.slice(0, 8).map((s) => `${s.date} ${s.time_start}`).join(", ");
  const conversation = history.slice(-6).map((m) =>
    `${m.role === "user" ? "Usuario" : "Bot"}: ${m.content}`
  ).join("\n");

  const prompt = `Sos un extractor de datos. Analizá esta conversación y determiná si el ÚLTIMO mensaje del usuario confirma o elige un turno específico de la lista.

Turnos disponibles ofrecidos: ${slotList}

Conversación:
${conversation}

Si el usuario eligió o confirmó un turno concreto de la lista, respondé ÚNICAMENTE con este JSON (sin markdown):
{"date":"YYYY-MM-DD","time_start":"HH:MM"}

Si NO eligió ninguno todavía (solo pregunta, duda, o habla de otra cosa), respondé ÚNICAMENTE con:
null`;

  let raw: string;
  try {
    raw = await getRawCompletion(prompt);
  } catch (err) {
    console.error("[appt] error en extracción de turno:", err);
    return;
  }

  const clean = raw.trim().replace(/```json|```/g, "").trim();
  if (clean === "null" || !clean.startsWith("{")) return;

  let parsed: { date?: string; time_start?: string };
  try {
    parsed = JSON.parse(clean);
  } catch {
    return;
  }

  const { date, time_start } = parsed;
  if (!date || !time_start) return;

  // Verificar que el slot sigue disponible en DB (no solo en la lista ofrecida)
  const stillAvailable = getAvailableSlots(date, defaultDuration).some(
    (s) => s.time_start === time_start
  );
  if (!stillAvailable) {
    console.log(`[appt] slot ${date} ${time_start} ya no está disponible, ignorando`);
    return;
  }

  // Evitar duplicado para esta conversación
  if (hasAppointmentForSlot(convoId, date, time_start)) {
    console.log(`[appt] ya existe turno para conversación ${convoId} en ${date} ${time_start}`);
    return;
  }

  const lead = getLeadByConversationId(convoId);
  const validSlot = offeredSlots.find((s) => s.date === date && s.time_start === time_start);
  if (!validSlot) return;

  const id = createAppointment({
    resource_id: validSlot.resource_id,
    conversation_id: convoId,
    date,
    time_start,
    duration_minutes: defaultDuration,
    source: "bot",
    contact_name: lead?.name ?? null,
    contact_phone: phone,
  });

  console.log(`[appt] turno PENDIENTE creado id=${id} para +${phone} → ${date} ${time_start}`);
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
  const toPhone = msg.to as string | undefined;
  const senderName = (msg.senderName as string) ?? null;

  if (!waId || !text || !rawPhone) {
    console.warn("[wh] mensaje incompleto, ignorando", msg);
    return;
  }

  // Filtrar mensajes destinados a otro número (webhooks son cuenta-nivel en YCloud)
  const ownNumber = process.env.YCLOUD_PHONE_NUMBER?.replace("+", "");
  if (toPhone && ownNumber && !toPhone.replace("+", "").endsWith(ownNumber.replace("+", ""))) {
    console.log(`[wh] mensaje para ${toPhone}, ignorando (este bot es ${ownNumber})`);
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

  // Marcar como leído inmediatamente (ticks azules → sensación de presencia humana)
  markMessageRead(waId).catch(() => {});

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

  // Primera respuesta del bot: delay corto para no parecer ignorado
  const hasPriorBotMessage = history.some((m) => m.role === "assistant");
  const delay = hasPriorBotMessage ? DELAY : Math.min(DELAY, 2000);

  pendingResponses.set(
    convo.id,
    setTimeout(() => {
      sendDebouncedReply(convo.id, phone).catch((err) =>
        console.error(`[wh] error en sendDebouncedReply para +${phone}:`, err)
      );
    }, delay)
  );

  console.log(`[wh] respuesta programada en ${delay}ms para +${phone}`);
}
