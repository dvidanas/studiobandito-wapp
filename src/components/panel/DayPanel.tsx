"use client";

import { useMemo } from "react";
import { formatDateLabel, formatTime, hoyArgentinaStr } from "@/lib/panelDates";
import { AppointmentCard } from "./AppointmentCard";
import { FRANJAS, HorarioGroup, franjaDeHora } from "./HorarioGroup";
import type { Appointment } from "./types";

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
}: {
  selectedDay: string;
  appointments: Appointment[];
  loading: boolean;
  onAdd: () => void;
  onStatusChange: (id: number, status: Appointment["status"]) => void;
  onDelete: (id: number) => void;
  onEdit: (appointment: Appointment) => void;
  highlightId?: number | null;
  searchQuery?: string;
  statusFilter?: "todos" | Appointment["status"];
}) {
  const label = formatDateLabel(selectedDay);
  const esHoy = selectedDay === hoyArgentinaStr();

  // Filtro por texto (nombre o teléfono) y por estado. Sin filtro de zona:
  // Bandito es mono-recurso.
  const filtrados = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((a) => {
      if (q) {
        const nombre = (a.contact_name ?? "").toLowerCase();
        const tel = (a.contact_phone ?? "").toLowerCase();
        if (!nombre.includes(q) && !tel.includes(q)) return false;
      }
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      return true;
    });
  }, [appointments, searchQuery, statusFilter]);

  const count = filtrados.length;
  const hayFiltro = searchQuery.trim() !== "" || statusFilter !== "todos";

  // Agrupamos por franja del día, no por hora: con un solo profesional cada hora
  // tiene a lo sumo un turno y agrupar por hora daría grupos de un elemento.
  const grupos = useMemo(() => {
    return FRANJAS.map((franja) => {
      const turnos = filtrados
        .filter((a) => franjaDeHora(a.time_start) === franja.id)
        .sort((a, b) => a.time_start.localeCompare(b.time_start));
      const vigentes = turnos.filter((a) => a.status !== "cancelled");
      return {
        ...franja,
        turnos,
        // El rango se calcula sobre los turnos reales, no sobre constantes: si
        // cambian los horarios de atención, la cabecera acompaña sola.
        rango: turnos.length
          ? `${formatTime(turnos[0].time_start)} – ${formatTime(turnos[turnos.length - 1].time_end)}`
          : undefined,
        pendientes: turnos.filter((a) => a.status === "pending").length,
        presentesInfo: esHoy
          ? { presentes: vigentes.filter((a) => !!a.presente).length, total: vigentes.length }
          : undefined,
      };
    }).filter((g) => g.turnos.length > 0);
  }, [filtrados, esHoy]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-wa-sep)] flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-wa-text-main)] capitalize">{label}</h2>
          <p className="text-sm text-[var(--color-wa-text-sec)]">
            {count === 0
              ? hayFiltro
                ? "Sin resultados"
                : "Sin turnos"
              : `${count} turno${count !== 1 ? "s" : ""}${hayFiltro ? ` de ${appointments.length}` : ""}`}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="text-sm font-semibold text-[var(--color-wa-green)] hover:underline"
        >
          + Agregar
        </button>
      </div>

      {/* Appointments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              defaultOpen
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
