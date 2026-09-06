"use client";

/**
 * Caja diaria.
 *
 * Los ingresos de las citas atendidas no se cargan a mano: el backend los
 * inserta solo al abrir el día (`autocargarIngresosDelDia`, idempotente por el
 * índice único sobre `cita_id`). Acá se ve el resultado, no se dispara.
 *
 * "Por cobrar" son las citas confirmadas de ese día que todavía no pasaron por
 * caja. Cobrar una la marca como atendida, que es lo que la hace entrar en los
 * ingresos y en el cálculo de comisiones del mes.
 *
 * En Semana y Mes la pantalla es de solo lectura: totales del período y el
 * desglose día por día. No aparecen ni el formulario de carga ni "Por cobrar"
 * porque las dos son acciones sobre un día concreto — un egreso sin fecha
 * habría que inventarlo, y cobrar es algo que se hace el día que la persona
 * está en el local.
 *
 * El resumen del rango no autocarga (ver `getCajaRango`): si algún día quedó
 * sin cerrar, se avisa en vez de escribir por atrás.
 */

import { useCallback, useEffect, useState } from "react";
import {
  PantallaPanel,
  Tarjeta,
  TituloSeccion,
  Metrica,
  Boton,
  Campo,
  claseInput,
  campoFechaForm,
  Aviso,
  Vacio,
  SelectorRango,
} from "@/components/panel/PanelChrome";
import { plata, hoyISO, fechaLarga } from "@/lib/format";
import { rangoDePreset, moverRango, type PresetRango } from "@/lib/panelDates";

interface Movimiento {
  id: number;
  fecha: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  origen: "manual" | "cita";
  cita_id: number | null;
}

interface PorCobrar {
  id: number;
  hora_inicio: string;
  precio_final: number | null;
  cliente: string | null;
  profesional: string;
  servicio: string | null;
}

interface Caja {
  fecha: string;
  movimientos: Movimiento[];
  total_ingresos: number;
  total_egresos: number;
  resultado_neto: number;
  por_cobrar: PorCobrar[];
  total_por_cobrar: number;
}

interface DiaDeCaja {
  fecha: string;
  movimientos: number;
  ingresos: number;
  egresos: number;
  neto: number;
}

interface CajaRango {
  desde: string;
  hasta: string;
  total_ingresos: number;
  total_egresos: number;
  neto: number;
  dias: DiaDeCaja[];
  sin_cargar: Array<{ fecha: string; turnos: number; monto: number }>;
}

const OPCIONES: Array<{ id: PresetRango; label: string }> = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

const fmtDia = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

/**
 * Grilla compacta de KPIs para el celular. Mismo dato que las tarjetas
 * grandes (`Metrica`, en PanelChrome) pero achicado.
 *
 * En 320px las tarjetas en grilla 2x2 medían 242px de alto y empujaban el
 * primer botón real de la pantalla — "Cobrar", en "Por cobrar" — a 615px de
 * scroll (medido con un día real de 15 turnos).
 *
 * Primer intento: una fila horizontal de una sola línea, como la que ya usa
 * Turnos (`TurnosToolbarMobile`). No entró: los montos en pesos ("$ 93.300")
 * son mucho más anchos que los números cortos de Turnos, y con las 4
 * etiquetas completas el contenido pedía 441px — no entraba ni en 390px de
 * ancho, solo scrolleando.Achicar más la letra o abreviar los montos
 * ("93,3k") habría sido inventar un formato de moneda nuevo, así que en vez
 * de eso se mantiene la grilla de 2 columnas que ya tenía `Metrica` — nada
 * más se le baja el tamaño. Con montos de hasta 6 cifras entra sin scrollear
 * en 320px, medido.
 *
 * No toca `Metrica` ni `PanelChrome`: esos los usa también Comisiones, y
 * cambiarlos acá le cambiaría esa pantalla antes de que le toque el turno.
 *
 * Se cae el texto de `detalle` ("El día cierra en positivo", "15 turnos
 * confirmados"): es contexto secundario, y el mismo dato ya está a la vista
 * — la lista de abajo tiene una fila por cada turno por cobrar.
 */
const TONOS_MINI: Record<"neutro" | "exito" | "error" | "acento", string> = {
  neutro: "var(--color-wa-text-main)",
  exito: "var(--color-wa-exito)",
  error: "var(--color-wa-error)",
  acento: "var(--color-wa-green)",
};

function MetricaMini({
  etiqueta,
  valor,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: string;
  tono?: keyof typeof TONOS_MINI;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)] truncate">
        {etiqueta}
      </p>
      <p className="tnum text-base font-extrabold truncate" style={{ color: TONOS_MINI[tono] }}>
        {valor}
      </p>
    </div>
  );
}

export default function CajaPage() {
  const [preset, setPreset] = useState<PresetRango>("dia");
  const [fecha, setFecha] = useState(hoyISO());
  const [caja, setCaja] = useState<Caja | null>(null);
  const [rangoData, setRangoData] = useState<CajaRango | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (f: string, p: PresetRango) => {
    setCargando(true);
    setError(null);
    try {
      const rango = rangoDePreset(p, f);
      const url = p === "dia"
        ? `/api/caja?fecha=${f}`
        : `/api/caja?desde=${rango.desde}&hasta=${rango.hasta}`;
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudo cargar la caja.");
      if (p === "dia") { setCaja(j); setRangoData(null); }
      else { setRangoData(j); setCaja(null); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCaja(null);
      setRangoData(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(fecha, preset);
  }, [fecha, preset, cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(monto);
    if (!concepto.trim()) return setError("Poné un concepto.");
    if (!Number.isFinite(valor) || valor <= 0) return setError("El monto tiene que ser mayor a cero.");

    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, tipo, concepto: concepto.trim(), monto: valor }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setConcepto("");
      setMonto("");
      await cargar(fecha, "dia");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(m: Movimiento) {
    setError(null);
    const r = await fetch(`/api/caja/${m.id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    await cargar(fecha, "dia");
  }

  async function cobrar(citaId: number) {
    setError(null);
    const r = await fetch("/api/caja/cobrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cita_id: citaId }),
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    await cargar(fecha, "dia");
  }

  const esHoy = fecha === hoyISO();
  const rango = rangoDePreset(preset, fecha);

  // Las flechas mueven la unidad que estás mirando: un día, una semana o un mes.
  const mover = (pasos: number) => setFecha(moverRango(preset, fecha, pasos));

  const descripcion = preset === "dia"
    ? `${fechaLarga(fecha)}${esHoy ? " · hoy" : ""}`
    : `${fmtDia(rango.desde)} — ${fmtDia(rango.hasta)}`;

  return (
    <PantallaPanel
      titulo={preset === "dia" ? "Caja diaria" : "Caja"}
      descripcion={descripcion}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <SelectorRango preset={preset} opciones={OPCIONES} onPreset={setPreset} />
          <div className="flex items-center gap-1.5">
            <Boton tipo="secundario" chico onClick={() => mover(-1)}>←</Boton>
            {preset === "dia" && (
              <input
                type="date"
                value={fecha}
                onChange={(e) => e.target.value && setFecha(e.target.value)}
                className={campoFechaForm}
              />
            )}
            <Boton tipo="secundario" chico onClick={() => mover(1)}>→</Boton>
            {!esHoy && (
              <Boton tipo="secundario" chico onClick={() => setFecha(hoyISO())}>Hoy</Boton>
            )}
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4">
          <Aviso texto={error} />
        </div>
      )}

      {preset !== "dia" ? (
        cargando && !rangoData ? (
          <p className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</p>
        ) : !rangoData ? null : (
          <div className="flex flex-col gap-5">
            <Tarjeta className="px-4 py-3 md:hidden">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <MetricaMini etiqueta="Ingresos" valor={plata(rangoData.total_ingresos)} tono="exito" />
                <MetricaMini etiqueta="Egresos" valor={plata(rangoData.total_egresos)} tono="error" />
                <MetricaMini
                  etiqueta="Neto del período"
                  valor={plata(rangoData.neto)}
                  tono={rangoData.neto >= 0 ? "exito" : "error"}
                />
              </div>
            </Tarjeta>
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Metrica etiqueta="Ingresos" valor={plata(rangoData.total_ingresos)} tono="exito" />
              <Metrica etiqueta="Egresos" valor={plata(rangoData.total_egresos)} tono="error" />
              <Metrica
                etiqueta="Neto del período"
                valor={plata(rangoData.neto)}
                tono={rangoData.neto >= 0 ? "exito" : "error"}
                detalle={`${rangoData.dias.length} día${rangoData.dias.length === 1 ? "" : "s"} con movimientos`}
              />
            </div>

            {/* Días con citas atendidas que nunca pasaron por caja. El resumen
                del rango no autocarga, así que en vez de mostrar un total corto
                sin avisar, se dice cuánto falta y dónde. */}
            {rangoData.sin_cargar.length > 0 && (
              <div className="px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Sin cargar en caja: {rangoData.sin_cargar.reduce((a, d) => a + d.turnos, 0)} turno
                  {rangoData.sin_cargar.reduce((a, d) => a + d.turnos, 0) === 1 ? "" : "s"} ·{" "}
                  {plata(rangoData.sin_cargar.reduce((a, d) => a + d.monto, 0))} en{" "}
                  {rangoData.sin_cargar.length} día{rangoData.sin_cargar.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Son citas atendidas que todavía no entraron a caja. Entran solas al abrir el día.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rangoData.sin_cargar.map((d) => (
                    <button
                      key={d.fecha}
                      onClick={() => { setFecha(d.fecha); setPreset("dia"); }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      {fmtDia(d.fecha)} · {plata(d.monto)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Tarjeta>
              <TituloSeccion>Desglose diario</TituloSeccion>
              {rangoData.dias.length === 0 ? (
                <Vacio>Sin movimientos en este período.</Vacio>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
                        <th className="text-left px-4 md:px-5 py-2.5">Día</th>
                        <th className="text-right px-3 py-2.5">Mov.</th>
                        <th className="text-right px-3 py-2.5">Ingresos</th>
                        <th className="text-right px-3 py-2.5">Egresos</th>
                        <th className="text-right px-4 md:px-5 py-2.5">Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-wa-sep)]">
                      {rangoData.dias.map((d) => (
                        <tr
                          key={d.fecha}
                          onClick={() => { setFecha(d.fecha); setPreset("dia"); }}
                          className="cursor-pointer hover:bg-[var(--color-wa-hover)] transition-colors"
                        >
                          <td className="px-4 md:px-5 py-3 font-medium text-[var(--color-wa-text-main)] capitalize">
                            {fmtDia(d.fecha)}
                          </td>
                          <td className="tnum px-3 py-3 text-right text-[var(--color-wa-text-sec)]">{d.movimientos}</td>
                          <td className="tnum px-3 py-3 text-right" style={{ color: "var(--color-wa-exito)" }}>
                            {d.ingresos > 0 ? plata(d.ingresos) : "—"}
                          </td>
                          <td className="tnum px-3 py-3 text-right" style={{ color: "var(--color-wa-error)" }}>
                            {d.egresos > 0 ? `-${plata(d.egresos)}` : "—"}
                          </td>
                          <td className="tnum px-4 md:px-5 py-3 text-right font-bold text-[var(--color-wa-text-main)]">
                            {plata(d.neto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--color-wa-sep)]">
                        <td className="px-4 md:px-5 py-3 font-bold text-[var(--color-wa-text-main)]" colSpan={2}>
                          Total del período
                        </td>
                        <td className="tnum px-3 py-3 text-right font-bold" style={{ color: "var(--color-wa-exito)" }}>
                          {plata(rangoData.total_ingresos)}
                        </td>
                        <td className="tnum px-3 py-3 text-right font-bold" style={{ color: "var(--color-wa-error)" }}>
                          {rangoData.total_egresos > 0 ? `-${plata(rangoData.total_egresos)}` : "—"}
                        </td>
                        <td className="tnum px-4 md:px-5 py-3 text-right font-bold text-[var(--color-wa-text-main)]">
                          {plata(rangoData.neto)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Tarjeta>
          </div>
        )
      ) : cargando && !caja ? (
        <p className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</p>
      ) : !caja ? null : (
        <div className="flex flex-col gap-5">
          <Tarjeta className="px-4 py-3 md:hidden">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <MetricaMini etiqueta="Ingresos" valor={plata(caja.total_ingresos)} tono="exito" />
              <MetricaMini etiqueta="Egresos" valor={plata(caja.total_egresos)} tono="error" />
              <MetricaMini
                etiqueta="Resultado neto"
                valor={plata(caja.resultado_neto)}
                tono={caja.resultado_neto >= 0 ? "exito" : "error"}
              />
              <MetricaMini etiqueta="Por cobrar" valor={plata(caja.total_por_cobrar)} tono="acento" />
            </div>
          </Tarjeta>
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Metrica etiqueta="Ingresos" valor={plata(caja.total_ingresos)} tono="exito" />
            <Metrica etiqueta="Egresos" valor={plata(caja.total_egresos)} tono="error" />
            <Metrica
              etiqueta="Resultado neto"
              valor={plata(caja.resultado_neto)}
              tono={caja.resultado_neto >= 0 ? "exito" : "error"}
              detalle={caja.resultado_neto >= 0 ? "El día cierra en positivo" : "El día cierra en negativo"}
            />
            <Metrica
              etiqueta="Por cobrar"
              valor={plata(caja.total_por_cobrar)}
              tono="acento"
              detalle={`${caja.por_cobrar.length} turno${caja.por_cobrar.length === 1 ? "" : "s"} confirmado${caja.por_cobrar.length === 1 ? "" : "s"}`}
            />
          </div>

          <Tarjeta>
            <TituloSeccion
              extra={
                <span className="text-xs text-[var(--color-wa-text-sec)]">
                  Cobrar marca la cita como atendida
                </span>
              }
            >
              Por cobrar
            </TituloSeccion>
            {caja.por_cobrar.length === 0 ? (
              <Vacio>No queda nada por cobrar en el día.</Vacio>
            ) : (
              <ul className="divide-y divide-[var(--color-wa-sep)]">
                {caja.por_cobrar.map((c) => (
                  <li key={c.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 md:px-5 py-3">
                    {/* Mobile: la hora va en píldora arriba del nombre, no
                        como columna angosta al lado — con hora + precio +
                        botón compitiendo por el ancho en la misma fila, el
                        nombre quedaba tan recortado que filas distintas se
                        leían igual ("Prueb…" repetido). El nombre entero
                        necesita su propia línea de ancho completo. */}
                    <span className="md:hidden tnum text-[11px] font-bold text-[var(--color-wa-text-main)] bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] py-0.5 px-2 rounded-full self-start">
                      {c.hora_inicio}
                    </span>
                    <span className="hidden md:block tnum text-sm font-bold text-[var(--color-wa-text-main)] w-12 shrink-0">
                      {c.hora_inicio}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-wa-text-main)] md:truncate">
                        {c.cliente ?? "Sin nombre"}
                      </p>
                      <p className="text-xs text-[var(--color-wa-text-sec)] truncate">
                        {c.servicio ?? "Sin servicio"} · {c.profesional}
                      </p>
                    </div>
                    <div className="flex md:contents items-center justify-between gap-3">
                      <span className="tnum text-sm font-bold text-[var(--color-wa-text-main)] shrink-0">
                        {plata(c.precio_final)}
                      </span>
                      <Boton chico onClick={() => cobrar(c.id)}>
                        Cobrar
                      </Boton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta>
            <TituloSeccion>Movimientos del día</TituloSeccion>

            <form
              onSubmit={agregar}
              className="flex flex-wrap items-end gap-3 px-4 md:px-5 py-4 border-b border-[var(--color-wa-sep)]"
            >
              <Campo etiqueta="Tipo">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as "ingreso" | "egreso")}
                  className={claseInput}
                >
                  <option value="egreso">Egreso</option>
                  <option value="ingreso">Ingreso</option>
                </select>
              </Campo>
              <Campo etiqueta="Concepto" ancho="flex-1 min-w-[180px]">
                <input
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Compra de insumos, venta de producto…"
                  className={claseInput}
                />
              </Campo>
              <Campo etiqueta="Monto">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                  className={`${claseInput} tnum w-32`}
                />
              </Campo>
              <Boton submit disabled={guardando}>
                {guardando ? "Guardando…" : "Agregar"}
              </Boton>
            </form>

            {caja.movimientos.length === 0 ? (
              <Vacio>Todavía no hay movimientos cargados en este día.</Vacio>
            ) : (
              <ul className="divide-y divide-[var(--color-wa-sep)]">
                {caja.movimientos.map((m) => {
                  const esIngreso = m.tipo === "ingreso";
                  return (
                    <li key={m.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 md:px-5 py-3">
                      <div className="flex md:contents items-center gap-3">
                        <span
                          className="w-1.5 h-8 rounded-full shrink-0"
                          style={{
                            backgroundColor: esIngreso
                              ? "var(--color-wa-exito)"
                              : "var(--color-wa-error)",
                          }}
                        />
                        {/* En mobile el concepto vuelve a truncarse: a
                            diferencia del nombre de un cliente en "Por
                            cobrar", este texto lo escribe el mismo barbero
                            ("Compra de insumos") y no hace falta leerlo
                            entero para saber de qué movimiento se trata. */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-wa-text-main)] truncate">
                            {m.concepto}
                          </p>
                          <p className="text-xs text-[var(--color-wa-text-sec)]">
                            {m.origen === "cita" ? "Automático · desde una cita atendida" : "Carga manual"}
                          </p>
                        </div>
                      </div>
                      <div className="flex md:contents items-center justify-between gap-3">
                        <span
                          className="tnum text-sm font-bold shrink-0"
                          style={{
                            color: esIngreso ? "var(--color-wa-exito)" : "var(--color-wa-error)",
                          }}
                        >
                          {esIngreso ? "+" : "−"}
                          {plata(m.monto)}
                        </span>
                        {m.origen === "manual" ? (
                          <Boton tipo="peligro" chico onClick={() => borrar(m)}>
                            Borrar
                          </Boton>
                        ) : (
                          // Borrarlo no serviría: el autocargado lo volvería a
                          // crear en la próxima apertura del día.
                          <span className="text-xs text-[var(--color-wa-text-sec)] w-[62px] text-center shrink-0">
                            desde cita
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}
    </PantallaPanel>
  );
}
