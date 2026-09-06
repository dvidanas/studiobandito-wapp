/** Formato de plata y fechas del panel. Todo en es-AR y hora de Argentina. */

const MONEDA = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function plata(valor: number | null | undefined): string {
  return MONEDA.format(valor ?? 0);
}

/** 'YYYY-MM-DD' de hoy en Argentina. El servidor puede estar en UTC. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 'YYYY-MM' del mes actual en Argentina. */
export function mesActualISO(): string {
  return hoyISO().slice(0, 7);
}

/**
 * 'YYYY-MM-DD' → "jueves 27 de agosto". Se construye con mediodía UTC para que
 * parsear la fecha no se corra un día por zona horaria.
 */
export function fechaLarga(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** 'YYYY-MM-DD' → "27/08". */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** 'YYYY-MM' → "agosto 2026". */
export function mesLargo(iso: string): string {
  return new Date(iso + "-01T12:00:00Z").toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Suma meses a un 'YYYY-MM' sin depender de Date para no cruzar zonas. */
export function sumarMes(iso: string, delta: number): string {
  const [a, m] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + delta;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** Suma días a un 'YYYY-MM-DD'. */
export function sumarDia(iso: string, delta: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Link al chat de WhatsApp de un teléfono. Puede venir con o sin código de
 * país; se antepone el 54 salvo que ya lo traiga.
 *
 * Vivía duplicado en AppointmentCard. Se movió acá cuando la pantalla de
 * horarios necesitó el mismo link para avisar de turnos cancelados: dos copias
 * de la misma regla de formato terminan divergiendo.
 */
export function waLink(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${digitos.startsWith("54") ? digitos : "54" + digitos}`;
}
