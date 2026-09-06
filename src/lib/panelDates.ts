// Helpers de fecha compartidos por las vistas del panel.
// Estaban duplicados inline en src/app/page.tsx y src/app/clients/page.tsx.

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DAY_HEADERS = ["D", "L", "M", "M", "J", "V", "S"];

export const DAY_NAMES_FULL = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];

export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const TIMEZONE_NEGOCIO = "America/Argentina/Buenos_Aires";

/**
 * Fecha "de hoy" según el reloj de Argentina, sin importar la zona horaria del
 * runtime que ejecuta el código (el servidor corre en UTC). Devuelve un Date
 * anclado a medianoche local, para que siga sirviendo con dateToStr() y con
 * aritmética local (setDate, getDay).
 *
 * Necesario porque `new Date()` en el servidor da la fecha UTC, que a partir de
 * las 21:00 de Argentina ya es el día siguiente: sin esto, los cálculos de
 * "hoy" se adelantan ~3 horas antes de la medianoche real.
 */
export function hoyArgentina(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(partes.find((p) => p.type === "year")!.value);
  const m = Number(partes.find((p) => p.type === "month")!.value);
  const d = Number(partes.find((p) => p.type === "day")!.value);
  return new Date(y, m - 1, d);
}

/** Atajo: fecha "de hoy" en Argentina, como string "YYYY-MM-DD". */
export function hoyArgentinaStr(): string {
  return dateToStr(hoyArgentina());
}

/** Atajo: fecha "de ayer" en Argentina, como string "YYYY-MM-DD". */
export function ayerArgentinaStr(): string {
  const ayer = hoyArgentina();
  ayer.setDate(ayer.getDate() - 1);
  return dateToStr(ayer);
}

/** "14:30:00" → "14:30". Para horas guardadas como texto (time_start/time_end). */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** "2026-08-24" → "Lunes 24 de agosto". */
export function formatDateLabel(str: string): string {
  const d = new Date(str + "T12:00:00Z");
  const day = DAY_NAMES_FULL[d.getUTCDay()];
  const num = d.getUTCDate();
  const month = MONTH_NAMES[d.getUTCMonth()].toLowerCase();
  return `${day} ${num} de ${month}`;
}

/** Primer y último día del mes de `date`, como strings "YYYY-MM-DD". */
export function getMonthBounds(date: Date): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    from: dateToStr(new Date(y, m, 1)),
    to: dateToStr(new Date(y, m + 1, 0)),
  };
}

// ── Rangos ────────────────────────────────────────────────────────────────
// Los usan Métricas, Caja y Comisiones. Estaban escritos en Métricas y se
// sacaron acá cuando aparecieron el segundo y el tercer uso.

/** Suma días a un "YYYY-MM-DD" sin pasar por el reloj local. */
export function sumarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Días entre dos fechas, ambas incluidas. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000
  ) + 1;
}

export type PresetRango = "dia" | "semana" | "mes" | "custom";

export interface Rango { desde: string; hasta: string }

/**
 * La semana arranca el LUNES, en las tres pantallas. Es la convención local y
 * lo que espera alguien que cobra por semana.
 *
 * `ancla` es el día de referencia: en Métricas es siempre hoy, en Caja y
 * Comisiones es el día que el usuario está mirando, para que las flechas
 * puedan moverse a la semana o al mes anterior.
 */
export function rangoDePreset(preset: PresetRango, ancla: string): Rango {
  if (preset === "dia") return { desde: ancla, hasta: ancla };
  if (preset === "semana") {
    const dow = new Date(`${ancla}T12:00:00Z`).getUTCDay(); // 0 = domingo
    const alLunes = dow === 0 ? 6 : dow - 1;
    const lunes = sumarDias(ancla, -alLunes);
    return { desde: lunes, hasta: sumarDias(lunes, 6) };
  }
  if (preset === "mes") {
    const primero = `${ancla.slice(0, 7)}-01`;
    const d = new Date(`${primero}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    return { desde: primero, hasta: d.toISOString().slice(0, 10) };
  }
  return { desde: ancla, hasta: ancla };
}

/** Mueve el rango un período entero para adelante o para atrás. */
export function moverRango(preset: PresetRango, ancla: string, pasos: number): string {
  if (preset === "dia") return sumarDias(ancla, pasos);
  if (preset === "semana") return sumarDias(ancla, pasos * 7);
  if (preset === "mes") {
    const d = new Date(`${ancla.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + pasos);
    return d.toISOString().slice(0, 10);
  }
  return ancla;
}

/** La ventana inmediatamente anterior, del mismo largo. */
export function rangoAnterior(desde: string, hasta: string): Rango {
  const dias = diasEntre(desde, hasta);
  const antHasta = sumarDias(desde, -1);
  return { desde: sumarDias(antHasta, -(dias - 1)), hasta: antHasta };
}
