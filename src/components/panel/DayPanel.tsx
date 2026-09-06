"use client";

import { useMemo } from "react";
import { formatDateLabel, formatTime, hoyArgentinaStr } from "@/lib/panelDates";
import { AppointmentCard } from "./AppointmentCard";
import { FRANJAS, HorarioGroup, enMinutos, franjaAAbrir, franjaDeHora, horaArgentina, type Franja } from "./HorarioGroup";
import {
  filtrarTurnos,
  hayFiltroActivo,
  type Appointment,
  type EstadoCita,
  type FiltroEstado,
} from "./types";

export function DayPanel({
  selectedDay,
  appointments,
  loading,
  onAdd,
  onStatusChange,
  onDelete,
  onEdit,
  highlightId = null,
  searchQuery = "",
  statusFilter = "todos",
  profesionalFilter = "todos",
  compacto = false,
}: {
  selectedDay: string;
  appointments: Appointment[];
  loading: boolean;
  onAdd: () => void;
  onStatusChange: (id: number, estado: EstadoCita) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
  highlightId?: number | null;
  searchQuery?: string;
  statusFilter?: FiltroEstado;
  profesionalFilter?: number | "todos";
  /**
   * Sólo lo usa la rama del celular. Saca la cabecera de día de este panel,
   * porque ahí arriba ya hay una fila con la misma fecha, el mismo conteo y el
   * mismo botón de "nuevo turno": tenerla dos veces costaba 95 px de los 504
   * que hay en un 320x568, y era lo que dejaba el primer turno fuera de la
   * pantalla. También achica los aires de la lista. El escritorio no la pasa.
   */
  compacto?: boolean;
}) {
  const label = formatDateLabel(selectedDay);
  const esHoy = selectedDay === hoyArgentinaStr();

  // El filtro vive en types.ts y lo comparte con la vista de lista. La
  // búsqueda mira también el profesional y el servicio: con varios barberos,
  // "quién atiende a Bruno" y "quién tiene los colores" son las dos preguntas
  // que más se hacen desde acá.
  const filtrados = useMemo(
    () => filtrarTurnos(appointments, { searchQuery, statusFilter, profesionalFilter }),
    [appointments, searchQuery, statusFilter, profesionalFilter]
  );

  const count = filtrados.length;
  const hayFiltro = hayFiltroActivo({ searchQuery, statusFilter, profesionalFilter });

  // Agrupamos por franja del día, no por hora: con varios barberos una misma
  // hora puede tener varios turnos, pero agrupar por hora igual daría grupos
  // minúsculos y una lista picada.
  const grupos = useMemo(() => {
    return FRANJAS.map((franja) => {
      const turnos = filtrados
        .filter((a) => franjaDeHora(a.hora_inicio) === franja.id)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio) || a.profesional_nombre.localeCompare(b.profesional_nombre));
      const vigentes = turnos.filter((a) => a.estado !== "cancelada");
      return {
        ...franja,
        turnos,
        // El rango se calcula sobre los turnos reales, no sobre constantes: si
        // cambian los horarios de atención, la cabecera acompaña sola.
        rango: turnos.length
          ? `${formatTime(turnos[0].hora_inicio)} – ${formatTime(turnos[turnos.length - 1].hora_fin)}`
          : undefined,
        // "Sin cerrar" en la cabecera de la franja: turnos que ya pasaron y
        // siguen confirmados. Es lo que hay que resolver antes de cerrar caja.
        pendientes: turnos.filter((a) => a.estado === "confirmada").length,
        presentesInfo: esHoy
          ? { presentes: vigentes.filter((a) => a.estado === "atendida").length, total: vigentes.length }
          : undefined,
      };
    }).filter((g) => g.turnos.length > 0);
  }, [filtrados, esHoy]);

  /**
   * Qué franja arranca abierta. Un día cargado con las dos abiertas son 4,5
   * pantallas de scroll en escritorio y 14 en el celular; abriendo sólo una,
   * 1,9 y 5,5. El encabezado cerrado ya dice cuántos turnos y cuántos
   * pendientes hay, así que no se esconde información, sólo se deja de bajar.
   *
   * La regla en sí vive en `franjaAAbrir`, en HorarioGroup: es una función pura
   * para poder probarla a cualquier hora sin depender del reloj de la máquina.
   * Acá sólo se decide si aplicarla y se le arma el resumen que necesita.
   */
  const franjaAbierta = useMemo((): Franja["id"] | null => {
    // Los días que no son hoy arrancan cerrados: se entra a mirar el volumen,
    // no a operar turno por turno.
    if (!esHoy && grupos.length > 1) return null;
    return franjaAAbrir(
      grupos.map((g) => ({
        id: g.id,
        desde: enMinutos(g.turnos[0].hora_inicio),
        hasta: enMinutos(g.turnos[g.turnos.length - 1].hora_fin),
        pendientes: g.pendientes,
      })),
      enMinutos(horaArgentina())
    );
  }, [grupos, esHoy]);

  // Buscando o filtrando, todo abierto: los resultados son lo que se vino a ver.
  const abrirPorDefecto = (id: Franja["id"]) => hayFiltro || id === franjaAbierta;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div
        className={`px-4 py-3.5 items-center justify-between gap-3 border-b border-[var(--color-wa-sep)] flex-shrink-0 ${
          compacto ? "hidden" : "flex"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Decorativo: la fecha ya está escrita al lado, así que se oculta a
              los lectores de pantalla en vez de repetirla. */}
          <div
            aria-hidden="true"
            className="hidden sm:flex w-10 h-10 rounded-xl bg-[var(--color-wa-green)]/10 text-[var(--color-wa-green)] items-center justify-center flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-wa-text-main)] capitalize leading-none">
                {label}
              </h2>
              {/* Píldora con el conteo. Cuando hay filtro activo aclara sobre
                  cuántos turnos se está filtrando, para que no parezca que
                  desaparecieron. */}
              <span
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                  count === 0
                    ? "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] border-[var(--color-wa-sep)]"
                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                }`}
              >
                {count === 0
                  ? hayFiltro
                    ? "Sin resultados"
                    : "Sin turnos"
                  : `${count} turno${count !== 1 ? "s" : ""}${hayFiltro ? ` de ${appointments.length}` : ""}`}
              </span>
            </div>
            <p className="text-xs text-[var(--color-wa-text-sec)] mt-1 font-medium">
              {hayFiltro ? "Resultado de la búsqueda en este día" : "Listado completo de turnos programados"}
            </p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="text-xs p-2.5 md:px-4 md:py-2.5 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
          title="Nuevo turno"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          <span className="hidden md:inline">Nuevo Turno</span>
        </button>
      </div>

      {/* Appointments */}
      <div className={`flex-1 overflow-y-auto ${compacto ? "px-3 pt-2 pb-3 space-y-3" : "p-4 space-y-6"}`}>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-[var(--color-wa-sep)] animate-pulse" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 text-[var(--color-wa-text-sec)] opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-base text-[var(--color-wa-text-sec)]">
              {hayFiltro ? "Ningún turno coincide con el filtro" : "Sin turnos este día"}
            </p>
            {!hayFiltro && (
              <button
                onClick={onAdd}
                className="mt-3 text-sm text-[var(--color-wa-green)] font-semibold hover:underline"
              >
                + Agregar turno
              </button>
            )}
          </div>
        ) : (
          grupos.map((g) => (
            <HorarioGroup
              key={`${selectedDay}-${g.id}`}
              titulo={g.titulo}
              rango={g.rango}
              cantidadTurnos={g.turnos.length}
              cantidadPendientes={g.pendientes}
              presentesInfo={g.presentesInfo}
              defaultOpen={abrirPorDefecto(g.id)}
              compacto={compacto}
            >
              {g.turnos.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onEdit={onEdit}
                    highlighted={a.id === highlightId}
                />
              ))}
            </HorarioGroup>
          ))
        )}
      </div>
    </div>
  );
}
