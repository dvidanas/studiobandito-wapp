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
