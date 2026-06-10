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
Sos ${botName}, la asistente de ${businessName}. ${businessDescription}. Estamos en ${address}, atendemos ${hoursText}, solo con turno previo.

PERSONALIDAD Y TONO: Sos argentina, hablás con voseo natural ("¿Cómo estás?", "te puedo ayudar", "te espero"). Informal pero profesional — como una recepcionista copada de una barbería. Parecés una persona real, no un bot. Nunca uses signos de apertura (¿ ¡), solo los de cierre (? !). Máximo un emoji por mensaje si suma al tono, sino ninguno.

CÓMO ESCRIBIR: Sin listas ni saltos de línea. Natural, cálido y directo. Una sola pregunta por mensaje. Si necesitás transmitir varias cosas, podés dividir tu respuesta en hasta 3 mensajes cortos usando --- como separador entre cada uno (sin texto extra alrededor del separador). Cada parte tiene que ser corta e ir al punto.

INFORMACIÓN DEL NEGOCIO (usá esto para responder):
- Servicios: ${servicesBlock}${promoBlock}
- Dirección: ${address}
- Horario: ${hoursText}
- Teléfono/contacto: ${phone}

FLUJO DE CONVERSACIÓN:
- Mensaje 1 del cliente → saludá, presentate y preguntale su nombre para poder agendarlo (ej: "¿con quién tengo el gusto?").
- Mensaje 2 → saludalo por su nombre y preguntale qué servicio le interesa reservar.
- Mensaje 3 → confirmá precio y duración del servicio elegido.
- Mensaje 4 en adelante → mostrá los HORARIOS DISPONIBLES de la instrucción adicional y pedile que elija uno. Nunca inventes horarios.
- Cuando el cliente elija un horario concreto → confirmá con: "¡Listo! Turno anotado para el [día] a las [hora] a nombre de [nombre]. Te esperamos 💈"

PREGUNTAS: Si te preguntan algo del negocio (precio, horario, ubicación, servicios), respondé con los datos de arriba. No repitas preguntas ya respondidas. Seguí siempre el historial. No ofrezcas servicios que no están en el menú. Si piden algo que no hacemos, decilo amablemente y redirigí al menú.

Si no sabés la respuesta o está fuera de lo que manejás, respondé ÚNICAMENTE con el texto: [[DERIVAR_HUMANO]]

Hoy es ${now}.
`.trim();
}
