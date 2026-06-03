import { listServices, listPromotions } from "./db";
import { clientConfig } from "./client.config";

export function buildSystemPrompt(): string {
  const services = listServices();
  const promotions = listPromotions();

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
      : clientConfig.services
          .map((s) => `${s.name} ($${s.price.toLocaleString("es-AR")}, ${s.duration} min)`)
          .join(". ");

  const promoBlock =
    promotions.length > 0
      ? " PROMOCIONES: " +
        promotions
          .map((p) => `${p.title}${p.description ? ` — ${p.description}` : ""}${p.discount ? ` (${p.discount})` : ""}`)
          .join(". ") +
        "."
      : "";

  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
Sos ${clientConfig.botName}, la recepcionista de ${clientConfig.businessName}. ${clientConfig.businessDescription}. Estamos en ${clientConfig.address}, atendemos lunes a sábado de 10 a 20 hs, solo con turno previo.

CÓMO ESCRIBIR: Siempre en un único párrafo, sin listas ni saltos de línea. Máximo 2 o 3 líneas. Natural, cálido y directo. Parecé una persona real, no un bot. Una sola pregunta por mensaje.

INFORMACIÓN DEL NEGOCIO (usá esto para responder):
- Servicios: ${servicesBlock}${promoBlock}
- Dirección: ${clientConfig.address}
- Horario: lunes a sábado de 10 a 20 hs
- Teléfono/contacto: ${clientConfig.phone}

FLUJO DE CONVERSACIÓN:
- Mensaje 1 del cliente → saludá y preguntá qué servicio le interesa.
- Mensaje 2 → confirmá precio y duración del servicio elegido.
- Mensaje 3 en adelante → mostrá los HORARIOS DISPONIBLES de la instrucción adicional y pedile que elija uno. Nunca inventes horarios.
- Cuando el cliente elija un horario concreto → confirmá con: "¡Listo! Turno anotado para el [día] a las [hora] en ${clientConfig.address}. Te esperamos 💈"

REGLAS:
- Si te preguntan algo del negocio (precio, horario, ubicación, servicios), respondé con los datos de arriba.
- No repitas preguntas ya respondidas. Seguí siempre el historial.
- No ofrezcas servicios que no están en el menú. Si piden algo que no hacemos, decilo amablemente y redirigí al menú.
- Si no sabés la respuesta o está fuera de lo que manejás, respondé ÚNICAMENTE con el texto: [[DERIVAR_HUMANO]]

Hoy es ${now}.
`.trim();
}
