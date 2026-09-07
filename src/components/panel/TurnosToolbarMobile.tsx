"use client";

import { useState } from "react";
import { COLOR_ESTADO, hayFiltroActivo, type FiltroEstado, type Resource } from "./types";
import { Select } from "./PanelChrome";

/**
 * La misma información que `TurnosToolbar`, para el celular.
 *
 * Es un componente aparte y no un puñado de clases `md:` dentro del otro por
 * una razón concreta: el panel ya renderiza dos ramas distintas (`hidden
 * md:flex` y `md:hidden`), así que acá "solo mobile" queda garantizado por
 * dónde se monta el componente, y no por una media query que haya que revisar
 * clase por clase. El escritorio no comparte una sola línea con esto.
 *
 * El barbero abre esta pantalla entre turno y turno, muchas veces por día. Lo
 * que tiene que ver al entrar es el turno que sigue, no el tablero: los cuatro
 * números pasan a una franja de una sola fila y todo lo que sea filtrar queda
 * detrás del botón de filtro. En 320 px la versión de escritorio gastaba
 * 387 px antes de la primera tarjeta; esto entra en 56.
 */

const claseSelect =
  "w-full bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] cursor-pointer";

const claseIrA =
  "flex-1 px-2 py-1.5 text-xs font-bold rounded-xl bg-[var(--color-wa-hover)] text-[var(--color-wa-text-main)] active:scale-95 transition-all cursor-pointer";

/**
 * Un número de la franja. El color es el mismo que usa la tarjeta grande del
 * escritorio (sale de COLOR_ESTADO), para que un número no cambie de color
 * según el ancho de la pantalla.
 *
 * La etiqueta va en minúscula y a 9 px, y no en versalitas como en el
 * escritorio, por una razón medida y no estética: en 320 px hay 252 px útiles,
 * y con MAYÚSCULAS a 10 px el peor caso real pedía 297. La etiqueta se cortaba
 * y quedaba "4h 30m A". En minúscula a 9 px el mismo contenido entra en 245,
 * incluso con el día lleno de los cuatro barberos (dos dígitos de hora).
 * Se achica la letra antes que perder una palabra: un número sin etiqueta no
 * se lee de un vistazo, que es para lo único que sirve esta fila.
 */
function Dato({ label, valor, tono }: { label: string; valor: string | number; tono: string }) {
  return (
    <div className="flex items-baseline gap-0.5 whitespace-nowrap">
      <span className="text-sm font-extrabold leading-none" style={{ color: tono }}>
        {valor}
      </span>
      <span className="text-[9px] font-bold text-[var(--color-wa-text-sec)] leading-none">
        {label}
      </span>
    </div>
  );
}

export function TurnosToolbarMobile({
  total,
  confirmados,
  atendidos,
  agenda,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  profesionales,
  profesionalFilter,
  onProfesionalFilterChange,
  onIrAHoy,
  onIrAManana,
  onIrAFinde,
}: {
  total: number;
  confirmados: number;
  atendidos: number;
  agenda: string;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: FiltroEstado;
  onStatusFilterChange: (v: FiltroEstado) => void;
  profesionales: Resource[];
  profesionalFilter: number | "todos";
  onProfesionalFilterChange: (v: number | "todos") => void;
  onIrAHoy: () => void;
  onIrAManana: () => void;
  onIrAFinde: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const filtrando = hayFiltroActivo({ searchQuery, statusFilter, profesionalFilter });

  return (
    <div className="flex-shrink-0 border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)]">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Los cuatro números en una fila. El `overflow-x-auto` es la red de
            seguridad, no el plan: perder alto es lo que empuja el turno fuera
            de pantalla, así que si algún día no entraran preferimos que se
            corran de costado antes que apilarse.

            Pero hoy entran, y a propósito. Medido con la tipografía real en
            320 px (252 px útiles, ya descontado el botón de filtro):

              MAYÚSCULAS 10px, gap 12, "9h 30m"   297 px   se cortaba
              minúsculas 10px, gap 8,  "9h30"     241 px   entra
              minúsculas  9px, gap 8,  "23h45"    245 px   entra el peor caso

            El peor caso es el día completo de los cuatro barberos: 44 h de
            capacidad, o sea dos dígitos de hora. Por eso se dimensiona contra
            "23h45" y no contra el día más cargado que hay hoy en la base. */}
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto">
          <Dato label="Turnos" valor={total} tono="#6366F1" />
          <Dato label="Conf." valor={confirmados} tono={COLOR_ESTADO.confirmada} />
          <Dato label="Atend." valor={atendidos} tono={COLOR_ESTADO.atendida} />
          <Dato label="Agenda" valor={agenda} tono="var(--color-wa-alerta)" />
        </div>

        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label={abierto ? "Ocultar filtros" : "Mostrar filtros"}
          className={`relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
            abierto || filtrando
              ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
              : "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 8.2v5.6l-4 2.2v-7.8L3 4.5z" />
          </svg>
          {/* El punto avisa que hay un filtro puesto aunque el panel esté
              cerrado: sin esto, una lista filtrada parece una lista vacía. */}
          {filtrando && !abierto && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-wa-alerta)] border-2 border-[var(--color-wa-panel-l)]" />
          )}
        </button>
      </div>

      {/* El buscador también vive acá adentro: dejarlo afuera costaba 44 px de
          alto permanente para algo que se usa cada tanto. */}
      {abierto && (
        <div className="px-3 pb-3 space-y-2">
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-wa-text-sec)]"
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
              className="w-full bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-xl pl-9 pr-8 py-2 text-sm text-[var(--color-wa-text-main)] placeholder-[var(--color-wa-text-sec)] focus:outline-none focus:border-[var(--color-wa-green)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-wa-text-sec)] cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={onIrAHoy} className={claseIrA}>
              Hoy
            </button>
            <button onClick={onIrAManana} className={claseIrA}>
              Mañana
            </button>
            {/* En Bandito el finde es el sábado: el domingo está cerrado. */}
            <button onClick={onIrAFinde} className={claseIrA} title="Ir al próximo sábado">
              Finde
            </button>
          </div>

          {/* Con un solo profesional activo el filtro no aporta nada — ver
              el mismo criterio en TurnosToolbar (desktop). */}
          {profesionales.length > 1 && (
            <Select
              value={String(profesionalFilter)}
              onChange={(e) =>
                onProfesionalFilterChange(e.target.value === "todos" ? "todos" : Number(e.target.value))
              }
              className={claseSelect}
              wrapperClassName="w-full"
              aria-label="Filtrar por profesional"
            >
              <option value="todos">Todos los barberos</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          )}

          {/* "Cancelados" agrupa los dos motivos; el optgroup deja filtrar por
              uno solo, que es para lo que sirve guardar el motivo. */}
          <Select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as FiltroEstado)}
            className={claseSelect}
            wrapperClassName="w-full"
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Sin confirmar (migrados)</option>
            <option value="confirmada">Solo confirmados</option>
            <option value="atendida">Solo atendidos</option>
            <option value="canceladas">Cancelados — todos</option>
            <optgroup label="Cancelados por motivo">
              <option value="cancelada">Canceló el turno</option>
              <option value="no_show">No vino</option>
            </optgroup>
          </Select>
        </div>
      )}
    </div>
  );
}
