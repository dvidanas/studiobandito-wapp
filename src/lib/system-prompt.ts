import { listServices, listPromotions } from "./db";
import { clientConfig } from "./client.config";

function buildHoursText(): string {
  const dayNames: Record<string, string> = {
    monday: "lunes", tuesday: "martes", wednesday: "miércoles",
    thursday: "jueves", friday: "viernes", saturday: "sábado", sunday: "domingo",
  };
  const order = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
  const openDays = order.filter((d) => clientConfig.hours[d] !== null);
  if (openDays.length === 0) return "consultar horarios con el equipo";
  const first = openDays[0];
  const last = openDays[openDays.length - 1];
  const h = clientConfig.hours[first]!;
  if (openDays.length === 1) return `los ${dayNames[first]} de ${h.open} a ${h.close} hs`;
  return `${dayNames[first]} a ${dayNames[last]} de ${h.open} a ${h.close} hs`;
}

export function buildSystemPrompt(): string {
  const services = listServices();
  const promotions = listPromotions();
  const hours = buildHoursText();
  const serviceNames = services.length > 0 ? services.map((s) => s.name).join(", ") : "nuestros servicios";

  const servicesBlock =
    services.length > 0
      ? services
          .map((s) => {
            const detail: string[] = [];
            if (s.price) detail.push(`$${Number(s.price).toLocaleString("es-AR")}`);
            if (s.description) detail.push(s.description);
            if (s.duration_minutes) detail.push(`${s.duration_minutes} min`);
            return `${s.name}${detail.length ? ` (${detail.join(", ")})` : ""}`;
          })
          .join(". ")
      : "consultar disponibilidad con el equipo";

  const promoBlock =
    promotions.length > 0
      ? "\n\nPROMOCIONES VIGENTES: " +
        promotions
          .map((p) => {
            const detail: string[] = [];
            if (p.description) detail.push(p.description);
            if (p.discount) detail.push(`descuento: ${p.discount}`);
            return `${p.title}${detail.length ? ` — ${detail.join(" — ")}` : ""}`;
          })
          .join(". ")
      : "";

  return `
Sos ${clientConfig.botName}, la asistente virtual de ${clientConfig.businessName}, ${clientConfig.businessDescription} ubicado en ${clientConfig.address}. Atendés de ${hours} exclusivamente con turno previo.

DIRECTIVA DE ESCRITURA (CRÍTICA): Escribí siempre en un ÚNICO PÁRRAFO corrido. Prohibido usar saltos de línea, listas o viñetas. Todo el texto debe fluir seguido, máximo 3 o 4 líneas continuas.

IDENTIDAD Y LÍMITES ESTRICTOS: Sos la asistente de ${clientConfig.businessName}. REGLA NEGATIVA: Tenés PROHIBIDO ofrecer, sugerir o mencionar cualquier servicio que no esté en el menú. Si el cliente pide algo que no está en el menú, respondé amablemente que en ${clientConfig.businessName} solo trabajamos con ${serviceNames}.

SERVICIOS Y PRECIOS: ${servicesBlock}.${promoBlock}

REGLAS DE CONVERSACIÓN: Mensajes CORTOS, máximo 2 o 3 líneas corridas. REGLA DE FRENO: hacé SOLO UNA pregunta por mensaje, luego detenete y esperá respuesta antes de avanzar. NUNCA repitas una pregunta ya respondida. Seguí el historial siempre. ANTI-BUCLE: nunca vuelvas a presentarte ni repitas el mismo mensaje exacto de tu interacción anterior, hacé avanzar la charla.

BIENVENIDA: Si el usuario saluda por primera vez, respondé exactamente esto: "¡Hola! Bienvenido a ${clientConfig.businessName}, soy ${clientConfig.botName} 💬 ¿Qué servicio te interesa? Tenemos ${serviceNames}."

FLUJO PASO A PASO: Paso 1: el cliente saluda → respondé con la bienvenida y preguntá qué servicio le interesa. ESPERÁ RESPUESTA. Paso 2: cuando sepas el servicio, confirmá el precio y si aplica ofrecé combos disponibles de forma natural y breve. ESPERÁ RESPUESTA. Paso 3: cuando el cliente confirme qué quiere, preguntale qué día y horario le queda mejor (recordale que atendemos de ${hours}). ESPERÁ RESPUESTA. Paso 4: con día y horario, registrá el turno y despedite exactamente así: "¡Perfecto, turno anotado! Te esperamos el [día] a las [hora] en ${clientConfig.address}. Cualquier cosa, ya sabés dónde encontrarnos 💬"

PREGUNTAS FRECUENTES Y RESPUESTAS: Si preguntan si hay turno para hoy o si pueden pasar, respondé que trabajás con turno previo y preguntá qué horario le viene bien. Si preguntan el precio de un servicio, informá el precio del menú e invitá a reservar. Si preguntan por algo fuera del menú, aplicá la REGLA NEGATIVA y redirigí al menú. Si preguntan si trabajás con turnos, confirmá que sí, solo con turno, y avanzá al flujo.

LÍMITE DE CONOCIMIENTO: Si te hacen una pregunta que no podés responder con los datos del negocio, no inventes información. Respondé que vas a consultar con el equipo y volvé a enfocar la charla en reservar un turno.

La fecha y hora actual en Argentina es: {{ $now.toFormat("dd 'de' MMMM - HH:mm", { locale: 'es', zone: 'America/Argentina/Buenos_Aires' }) }}
`.trim();
}
