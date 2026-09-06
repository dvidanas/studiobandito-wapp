// Tipos y constantes compartidas por las vistas del panel de turnos.
//
// Los nombres de campo son los de la tabla `citas`: el panel no traduce el
// modelo. Lo que llega de /api/citas es exactamente esto.

/**
 * Los valores que acepta `citas.estado` en la base.
 *
 * A nivel producto son TRES estados propios de Corte: 'no_show' no es un
 * estado aparte, es el MOTIVO de una cancelación. Se dejó dentro de `estado`
 * en vez de abrir una columna `motivo` por dos razones: ya guarda exactamente
 * ese dato (duplicarlo sería tener dos fuentes de verdad), y cambiar el CHECK
 * de `citas` en SQLite obliga a reconstruir la tabla de la que cuelgan caja y
 * comisiones.
 *
 * 'pendiente' es una DIVERGENCIA de Bandito respecto a Corte, documentada en
 * el CLAUDE.md de la raíz: la migración trajo 283 turnos reales de cuatro
 * meses de uso, y 11 de ellos nunca llegaron a confirmarse — Sol nunca tomó
 * esa decisión. Corte elimina ese estado porque ahí toda cita nace
 * confirmada; forzar esos 11 turnos a 'confirmada' o 'cancelada' habría sido
 * fabricar una decisión que ella nunca tomó. Es la única extensión del CHECK
 * de `citas.estado` respecto al schema de Corte.
 *
 * Ver `EstadoVisible` y `esCancelado` acá abajo.
 */
export type EstadoCita = "pendiente" | "confirmada" | "atendida" | "cancelada" | "no_show";

export interface Appointment {
  id: number;
  sucursal_id: number | null;
  profesional_id: number;
  profesional_nombre: string;
  servicio_id: number | null;
  servicio_nombre: string | null;
  servicio_duracion: number | null;
  cliente_id: number | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  conversation_id: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoCita;
  origen: "manual" | "bot" | "web";
  precio_final: number | null;
  descuento_id: number | null;
  notas: string | null;
  created_at: string;
}

export interface Resource {
  id: number;
  nombre: string;
  sucursal_id: number | null;
  activo: number;
}

export interface Servicio {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: number;
}

export interface AvailableSlot {
  profesional_id: number;
  profesional_nombre: string;
  sucursal_id: number | null;
  hora_inicio: string;
  hora_fin: string;
}

export type Stats = Record<EstadoCita, number>;

/**
 * Los estados que ve el usuario. 'no_show' colapsa dentro de 'cancelada'.
 * 'pendiente' se agrega acá (no en Corte) por la misma razón que en
 * EstadoCita: existe en datos reales migrados y tiene que poder mostrarse y
 * resolverse, no solo guardarse.
 */
export type EstadoVisible = "pendiente" | "confirmada" | "atendida" | "cancelada";

/** El porqué de una cancelación. Los valores son los mismos de `EstadoCita`. */
export type MotivoCancelacion = "cancelada" | "no_show";

/**
 * Nada compara `estado === "cancelada"` a mano: se cuentan cancelaciones de
 * menos, porque las ausencias también son cancelaciones. Siempre `esCancelado`.
 */
export const esCancelado = (e: EstadoCita): boolean => e === "cancelada" || e === "no_show";

export const estadoVisible = (e: EstadoCita): EstadoVisible =>
  e === "no_show" ? "cancelada" : e;

/** El motivo de una cita cancelada, o null si no está cancelada. */
export const motivoDe = (e: EstadoCita): MotivoCancelacion | null =>
  esCancelado(e) ? (e as MotivoCancelacion) : null;

/**
 * El color de un estado sale de acá y de ningún otro lado — los hex viven en
 * globals.css. 'atendida' es la que dispara el ingreso en caja, y por eso se
 * queda con el verde de éxito.
 *
 * Los dos motivos de cancelación comparten color a propósito: lo que los
 * distingue es la etiqueta ("Cancelado" / "No vino"), no el color.
 */
export const COLOR_ESTADO: Record<EstadoVisible, string> = {
  pendiente: "var(--color-estado-pendiente)",
  confirmada: "var(--color-estado-confirmada)",
  atendida: "var(--color-estado-atendida)",
  cancelada: "var(--color-estado-cancelada)",
};

export const colorDeEstado = (e: EstadoCita): string => COLOR_ESTADO[estadoVisible(e)];

/** Etiqueta de la cita. En cancelada distingue el motivo; el color no. */
export const STATUS_LABELS: Record<EstadoCita, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmado",
  atendida: "Atendido",
  cancelada: "Cancelado",
  no_show: "No vino",
};

/** Los cinco de la base (los cuatro de Corte + 'pendiente' de Bandito). Lo usa la validación de la API. */
export const ESTADOS: EstadoCita[] = ["pendiente", "confirmada", "atendida", "cancelada", "no_show"];

/**
 * Lo que ofrece el selector de estado de la toolbar. "canceladas" agrupa los
 * dos motivos; 'cancelada' y 'no_show' filtran uno solo.
 */
export type FiltroEstado = "todos" | "canceladas" | EstadoCita;

/**
 * Filtro de la vista de Turnos, en un solo lugar: lo usan la vista de día y la
 * de lista, que antes filtraban distinto (la lista no filtraba nada).
 */
export function filtrarTurnos(
  turnos: Appointment[],
  { searchQuery = "", statusFilter = "todos", profesionalFilter = "todos" }: {
    searchQuery?: string;
    statusFilter?: FiltroEstado;
    profesionalFilter?: number | "todos";
  }
): Appointment[] {
  const q = searchQuery.trim().toLowerCase();
  return turnos.filter((a) => {
    if (q) {
      const campos = [a.cliente_nombre, a.cliente_telefono, a.servicio_nombre, a.profesional_nombre];
      if (!campos.some((c) => c?.toLowerCase().includes(q))) return false;
    }
    if (profesionalFilter !== "todos" && a.profesional_id !== profesionalFilter) return false;
    if (statusFilter === "canceladas") return esCancelado(a.estado);
    if (statusFilter !== "todos" && a.estado !== statusFilter) return false;
    return true;
  });
}

export const hayFiltroActivo = ({ searchQuery = "", statusFilter = "todos", profesionalFilter = "todos" }: {
  searchQuery?: string;
  statusFilter?: FiltroEstado;
  profesionalFilter?: number | "todos";
}): boolean =>
  searchQuery.trim() !== "" || statusFilter !== "todos" || profesionalFilter !== "todos";
