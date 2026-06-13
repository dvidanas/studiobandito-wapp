import type { WAMessage } from "@whiskeysockets/baileys";
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
  "gusto", "quién", "quien", "quién sos", "quien sos", "tu nombre"
];

const pendingResponses = new Map<number, ReturnType<typeof setTimeout>>();

function hasLeadIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

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

function extractText(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    null
  );
}

function extractPhone(jid: string): string {
  return jid.split("@")[0].split(":")[0];
}

async function sendDebouncedReply(convoId: number, phone: string, sendJid: string): Promise<void> {
  pendingResponses.delete(convoId);

  const fresh = getConversationById(convoId);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[wh] modo ${fresh?.mode ?? "?"} — sin respuesta automática`);
    return;
  }

  const history = getRecentHistory(convoId, 20);
  const chatHistory: ChatMessage[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const apptConfig = (clientConfig as Record<string, unknown>).appointments as
    | { enabled: boolean }
    | undefined;
  const duration: number = (clientConfig as Record<string, unknown>).appointmentDuration as number ?? 40;
  let availabilityNote = "";
  let offeredSlots: Array<AvailableSlot & { date: string }> = [];
  if (apptConfig?.enabled) {
    offeredSlots = getNextAvailableSlots(14, duration);
    console.log(`[DIAG] slots crudos (${offeredSlots.length} total):`, JSON.stringify(offeredSlots.slice(0, 60).map(s => `${s.date} ${s.time_start}`)));
    if (offeredSlots.length > 0) {
      const slotList = offeredSlots
        .slice(0, 60)
        .map((s) => {
          const d = new Date(s.date + "T12:00:00");
          const dayName = d.toLocaleDateString("es-AR", { weekday: "long" });
          const [, month, day] = s.date.split("-");
          return `${dayName} ${day}/${month} a las ${s.time_start}`;
        })
        .join(", ");
      availabilityNote =
        `HORARIOS DISPONIBLES: ${slotList}. ` +
        "Cuando el cliente quiera reservar, mostrá estos horarios concretos para que elija uno. No inventes otros horarios. " +
        "IMPORTANTE: Revisa la lista de HORARIOS DISPONIBLES minuciosamente por lo menos dos veces antes de contestar si hay o no turnos para un día específico (como el jueves u otra fecha). Si el día solicitado figura en la lista con horarios libres, ofrecelos. Si no figura en la lista de arriba, indica amablemente que para ese día no hay disponibilidad.";
    }
  }

  // Para JIDs @lid (privacidad de WhatsApp) no tenemos el número real de teléfono
  const contactPhone = sendJid.endsWith("@s.whatsapp.net") ? phone : null;

  // Intentar reservar ANTES de que Soledad responda, para que su respuesta refleje la realidad
  let bookedSlot: { date: string; time_start: string } | null = null;
  if (apptConfig?.enabled && offeredSlots.length > 0) {
    bookedSlot = await tryBookAppointmentFromChat(convoId, phone, contactPhone, history, offeredSlots, duration).catch(
      (err) => { console.error("[appt] error en tryBookAppointmentFromChat:", err); return null; }
    );
  }

  let extraInstruction = availabilityNote || undefined;
  if (bookedSlot) {
    const bookingNote = `TURNO CONFIRMADO Y GUARDADO: El sistema registró exitosamente el turno para el ${bookedSlot.date} a las ${bookedSlot.time_start}. Confirmale al cliente que quedó agendado para esa fecha y hora.`;
    extraInstruction = extraInstruction ? `${extraInstruction}\n\n${bookingNote}` : bookingNote;
  }

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

  if (rawTrimmed.includes("[[DERIVAR_HUMANO]]")) {
    console.log(`[wh] derivando a humano para +${phone}`);
    setMode(convoId, "HUMAN");
    const fallback = "Disculpá, para esa consulta te paso con alguien del equipo. En un momento te atienden 🙏";
    const messageId = insertMessage(convoId, "assistant", fallback, null);
    try {
      const { wa_message_id } = await sendTextMessage(sendJid, fallback);
      updateMessageWaId(messageId, wa_message_id);
    } catch (err) {
      console.error(`[wh] error al enviar fallback a +${phone}:`, err);
    }
    return;
  }

  const parts = rawTrimmed
    .split(/\s*---\s*/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);

  for (let i = 0; i < parts.length; i++) {
    if (i > 0) await new Promise((res) => setTimeout(res, 2000));
    const part = parts[i];
    const messageId = insertMessage(convoId, "assistant", part, null);
    try {
      const { wa_message_id } = await sendTextMessage(sendJid, part);
      updateMessageWaId(messageId, wa_message_id);
      console.log(`[wh] → parte ${i + 1}/${parts.length} enviada a +${phone} (jid: ${sendJid})`);
    } catch (err) {
      console.error(`[wh] error al enviar parte ${i + 1} a +${phone}:`, err);
    }
  }
}

async function tryBookAppointmentFromChat(
  convoId: number,
  phone: string,
  contactPhone: string | null,
  history: { role: string; content: string }[],
  offeredSlots: Array<AvailableSlot & { date: string }>,
  defaultDuration: number
): Promise<{ date: string; time_start: string } | null> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return null;

  const slotList = offeredSlots.map((s) => `${s.date} ${s.time_start}`).join(", ");
  const conversation = history.slice(-6).map((m) =>
    `${m.role === "user" ? "Usuario" : "Bot"}: ${m.content}`
  ).join("\n");

  const prompt = `Sos un extractor de datos. Analizá esta conversación y determiná si el ÚLTIMO mensaje del usuario confirma o elige un turno específico de la lista.

Turnos disponibles ofrecidos: ${slotList}

Conversación:
${conversation}

Si el usuario eligió o confirmó un turno concreto de la lista, respondé ÚNICAMENTE con este JSON (sin markdown):
{"date":"YYYY-MM-DD","time_start":"HH:MM","service":"nombre del servicio mencionado en la conversación o null"}

Si NO eligió ninguno todavía (solo pregunta, duda, o habla de otra cosa), respondé ÚNICAMENTE con:
null`;

  let raw: string;
  try {
    raw = await getRawCompletion(prompt);
  } catch (err) {
    console.error("[appt] error en extracción de turno:", err);
    return null;
  }

  const clean = raw.trim().replace(/```json|```/g, "").trim();
  if (clean === "null" || !clean.startsWith("{")) {
    console.log(`[appt] extractor devolvió null (sin turno detectado): "${clean.slice(0, 80)}"`);
    return null;
  }

  let parsed: { date?: string; time_start?: string; service?: string | null };
  try {
    parsed = JSON.parse(clean);
  } catch {
    return null;
  }

  const { date, time_start, service } = parsed;
  if (!date || !time_start) return null;

  console.log(`[appt] extractor detectó: ${date} ${time_start} servicio="${service ?? "null"}"`);

  const stillAvailable = getAvailableSlots(date, defaultDuration).some(
    (s) => s.time_start === time_start
  );
  if (!stillAvailable) {
    console.log(`[appt] slot ${date} ${time_start} ya no está disponible, ignorando`);
    return null;
  }

  if (hasAppointmentForSlot(convoId, date, time_start)) {
    console.log(`[appt] ya existe turno para conversación ${convoId} en ${date} ${time_start}`);
    return null;
  }

  const lead = getLeadByConversationId(convoId);
  const convo = getConversationById(convoId);
  const validSlot = offeredSlots.find((s) => s.date === date && s.time_start === time_start);
  if (!validSlot) {
    console.log(`[appt] slot ${date} ${time_start} no está en offeredSlots (${offeredSlots.length} slots disponibles) — posible desfase de sesión`);
    return null;
  }

  const contactName = lead?.name ?? convo?.name ?? null;

  const matchedService = service
    ? clientConfig.services.find((s) =>
        s.name.toLowerCase().includes(service.toLowerCase()) ||
        service.toLowerCase().includes(s.name.toLowerCase().split("/")[0].trim())
      )
    : null;
  const appointmentDuration = matchedService?.duration ?? defaultDuration;

  const id = createAppointment({
    resource_id: validSlot.resource_id,
    conversation_id: convoId,
    service: service ?? null,
    date,
    time_start,
    duration_minutes: appointmentDuration,
    source: "bot",
    contact_name: contactName,
    contact_phone: contactPhone,
  });

  console.log(`[appt] turno PENDIENTE creado id=${id} para +${phone} → ${date} ${time_start}`);
  return { date, time_start };
}

export async function handleBaileysMessage(msg: WAMessage): Promise<void> {
  const jid = msg.key.remoteJid;
  if (!jid || jid.endsWith("@g.us")) return;

  const waId = msg.key.id!;
  const text = extractText(msg);
  const phone = extractPhone(jid);
  const senderName = (msg as { pushName?: string }).pushName ?? null;

  if (!text?.trim()) {
    console.log(`[wh] mensaje sin texto de +${phone}, ignorando`);
    return;
  }

  if (wasMessageProcessed(waId)) {
    console.log(`[wh] duplicado ${waId}, ignorando`);
    return;
  }
  markMessageProcessed(waId);

  console.log(`[wh] ← de +${phone}: "${text.slice(0, 60)}"`);

  markMessageRead(jid, waId).catch(() => {});

  const convo = getOrCreateConversation(phone, senderName, jid);
  insertMessage(convo.id, "user", text, waId);

  const history = getRecentHistory(convo.id, 20);
  const lastBotMessage =
    [...history].reverse().find((m) => m.role === "assistant")?.content ?? null;

  if (!convo.has_lead && hasLeadIntent(text)) {
    const existingLead = getLeadByConversationId(convo.id);
    if (!existingLead) {
      createLead(convo.id, convo.phone, convo.name);
      setConversationHasLead(convo.id, 1);
      console.log(`[lead] capturado por intención de +${phone} (${convo.name ?? "sin nombre"})`);
    }
  }

  if (convo.has_lead && looksLikeName(text, lastBotMessage)) {
    const lead = getLeadByConversationId(convo.id);
    if (lead && !isRealName(lead.name)) {
      updateLead(lead.id, { name: text.trim() });
      console.log(`[lead] nombre actualizado → ${text.trim()}`);
    }
  }

  const fresh = getConversationById(convo.id);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[wh] modo ${fresh?.mode ?? "?"} — sin respuesta automática`);
    return;
  }

  const existing = pendingResponses.get(convo.id);
  if (existing) {
    clearTimeout(existing);
    console.log(`[wh] timer reiniciado para +${phone}`);
  }

  const hasPriorBotMessage = history.some((m) => m.role === "assistant");
  const delay = hasPriorBotMessage ? DELAY : Math.min(DELAY, 2000);

  pendingResponses.set(
    convo.id,
    setTimeout(() => {
      sendDebouncedReply(convo.id, phone, jid).catch((err) =>
        console.error(`[wh] error en sendDebouncedReply para +${phone}:`, err)
      );
    }, delay)
  );

  console.log(`[wh] respuesta programada en ${delay}ms para +${phone}`);
}

// Suprimir warning de variable no usada — se mantiene para compatibilidad con métricas
void isEngagedMessage;
