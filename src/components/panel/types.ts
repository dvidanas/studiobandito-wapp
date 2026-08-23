// Tipos y constantes compartidas por las vistas del panel de turnos.
// Estaban inline en app/(dashboard)/page.tsx.

export interface Appointment {
  id: number;
  resource_id: number;
  resource_name: string;
  conversation_id: number | null;
  service: string | null;
  date: string;
  time_start: string;
  time_end: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled";
  source: "manual" | "bot" | "web";
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: number;
  /** Llega recién con la columna `presente` de la base (Fase 6). */
  presente?: number;
}

export interface Resource {
  id: number;
  name: string;
  active: number;
}

export interface AvailableSlot {
  resource_id: number;
  resource_name: string;
  time_start: string;
  time_end: string;
}

export interface Stats {
  pending: number;
  confirmed: number;
  cancelled: number;
}

export const STATUS_STYLES = {
  pending: "bg-amber-400 text-[#141d37]",
  confirmed: "bg-teal-400 text-teal-950",
  cancelled: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]",
};
export const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };
