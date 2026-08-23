"use client";

import type { Appointment } from "./types";

/**
 * Fila de stats + barra de búsqueda y filtros de la vista de Turnos.
 * Portado del patrón de Pasta Lovers, sin el filtro de zona: Bandito atiende
 * con un solo profesional.
 *
 * Todos los números salen de los turnos ya cargados en la página; no hay
 * consultas ni métricas nuevas.
 */

function StatCard({
  label,
  valor,
  sufijo,
  color,
  icon,
}: {
  label: string;
  valor: string | number;
  sufijo?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--color-wa-sep)] rounded-2xl p-3 lg:p-4 bg-[var(--color-wa-panel-l)] shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] lg:text-xs font-bold text-[var(--color-wa-text-sec)] uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-xl lg:text-2xl font-extrabold text-[var(--color-wa-text-main)] mt-0.5 leading-none">
          {valor}
          {sufijo && (
            <span className="text-xs font-normal text-[var(--color-wa-text-sec)] ml-1">{sufijo}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function TurnosToolbar({
  total,
  confirmados,
  pendientes,
  agenda,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onIrAHoy,
  onIrAManana,
}: {
  total: number;
  confirmados: number;
  pendientes: number;
  agenda: string;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: "todos" | Appointment["status"];
  onStatusFilterChange: (v: "todos" | Appointment["status"]) => void;
  onIrAHoy: () => void;
  onIrAManana: () => void;
}) {
  return (
    <div className="flex-shrink-0 space-y-3">
      {/* Stats del día seleccionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Turnos del día"
          valor={total}
          color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          icon={
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Confirmados"
          valor={confirmados}
          color="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          icon={
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pendientes"
          valor={pendientes}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          icon={
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Agenda ocupada"
          valor={agenda}
          color="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          icon={
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Búsqueda, accesos rápidos y filtro de estado */}
      <div className="border border-[var(--color-wa-sep)] rounded-2xl p-3 bg-[var(--color-wa-panel-l)] flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-wa-text-sec)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-xl pl-10 pr-8 py-2 text-sm text-[var(--color-wa-text-main)] placeholder-[var(--color-wa-text-sec)] focus:outline-none focus:border-[var(--color-wa-green)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--color-wa-text-sec)] mr-0.5">Ir a:</span>
          <button
            onClick={onIrAHoy}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--color-wa-hover)] text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-green)] hover:text-[var(--color-wa-green-text)] transition-all cursor-pointer active:scale-95"
          >
            Hoy
          </button>
          <button
            onClick={onIrAManana}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--color-wa-hover)] text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-green)] hover:text-[var(--color-wa-green-text)] transition-all cursor-pointer active:scale-95"
          >
            Mañana
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "todos" | Appointment["status"])}
          className="bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="confirmed">Solo confirmados</option>
          <option value="pending">Solo pendientes</option>
          <option value="cancelled">Solo cancelados</option>
        </select>
      </div>
    </div>
  );
}
