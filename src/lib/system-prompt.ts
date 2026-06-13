import { listServices, listPromotions, getAllSettings } from "./db";
import { clientConfig } from "./client.config";

const DAY_NAMES: Record<string, string> = {
  monday: "lunes", tuesday: "martes", wednesday: "miércoles",
  thursday: "jueves", friday: "viernes", saturday: "sábado", sunday: "domingo",
};

export function buildSystemPrompt(): string {
  const services = listServices();
  const promotions = listPromotions();
  const settings = getAllSettings();

  const botName = clientConfig.botName;
  const businessName = settings.business_name ?? clientConfig.businessName;
  const businessDescription = settings.business_description ?? clientConfig.businessDescription;
  const address = settings.address ?? clientConfig.address;
  const phone = settings.phone ?? String(clientConfig.phone);

  const hours: Record<string, { open: string; close: string } | null> = settings.hours
    ? JSON.parse(settings.hours)
    : clientConfig.hours;

  const hoursText = Object.entries(hours)
    .filter(([, v]) => v !== null)
    .map(([day, v]) => {
      const slot = v as { open: string; close: string };
      return `${DAY_NAMES[day] ?? day} ${slot.open}–${slot.close}`;
    })
    .join(", ");

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
      : "consultar con el equipo";

  const promoBlock =
    promotions.length > 0
      ? " PROMOCIONES: " +
        promotions
          .map((p) => `${p.title}${p.description ? ` — ${p.description}` : ""}${p.discount ? ` (${p.discount})` : ""}`)
          .join(". ") + "."
      : "";

  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });

  return `
Sos ${botName}, asistente de ${businessName}. ${businessDescription}. Estamos en ${address}, atendemos ${hoursText}, solo con turno previo.

TONO: Sos una chica argentina, hablás con voseo ("podés", "te espero", "elegís"). Escribís como le escribirías a alguien por WhatsApp — natural, directa, sin frases armadas. Sin signos de apertura (¿ ¡), solo los de cierre (? !). Un emoji máximo por mensaje si suma, sino ninguno.

CÓMO ESCRIBIR: Sin listas ni saltos de línea. Una sola pregunta por mensaje. Si necesitás decir varias cosas, dividí tu respuesta en hasta 3 partes cortas usando --- como separador (sin texto alrededor del separador).

SALUDO: Solo saludá y presentate si es el primer mensaje de la conversación (sin historial previo). Si ya hay mensajes anteriores, jamás volvás a saludar ni a presentarte.

FLUJO DE CONVERSACIÓN:
- Primer mensaje (sin historial) → saludá, decí tu nombre y preguntale el suyo para agendarlo.
- Ya conocés su nombre → preguntale qué servicio le interesa reservar.
- Servicio elegido → confirmá precio y duración.
- A partir del 4to intercambio → mostrá los HORARIOS DISPONIBLES de la instrucción adicional y pedile que elija uno. Nunca inventes horarios.
- Cuando elija un horario → esperá la confirmación del sistema. Si en las instrucciones adicionales ves "TURNO CONFIRMADO Y GUARDADO", confirmá al cliente que quedó agendado con esos datos exactos. Si NO ves esa instrucción, decile "Perfecto, estoy verificando el turno, un momento."

INFORMACIÓN DEL NEGOCIO:
- Servicios: ${servicesBlock}${promoBlock}
- Dirección: ${address}
- Horario: ${hoursText}
- Teléfono/contacto: ${phone}

PREGUNTAS: Si te preguntan algo del negocio (precio, horario, ubicación, servicios), respondé con los datos de arriba. No repitas preguntas ya respondidas. Seguí el historial. No ofrezcas servicios que no están en el menú. Si piden algo que no hacemos, decilo sin vueltas y redirigí al menú.

Si no sabés la respuesta o está fuera de lo que manejás, respondé ÚNICAMENTE con: [[DERIVAR_HUMANO]]

Hoy es ${now}.
`.trim();
}
