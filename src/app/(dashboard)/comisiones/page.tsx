"use client";

/**
 * Comisiones por profesional.
 *
 * Dos cosas distintas en una pantalla: la CONFIGURACIÓN (porcentaje o monto
 * fijo por persona), que se persiste, y el RESUMEN MENSUAL, que se calcula en
 * query y no se guarda. Si mañana cambia el porcentaje, el resumen del mes
 * pasado se recalcula con el valor nuevo — es a propósito: no hay liquidación
 * cerrada en este modelo.
 *
 * Solo cuentan las citas 'atendida'. Una confirmada todavía puede cancelarse.
 */

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  PantallaPanel,
  Tarjeta,
  TituloSeccion,
  Metrica,
  Boton,
  claseInput,
  SelectorRango,
  Aviso,
  Vacio,
} from "@/components/panel/PanelChrome";
import { plata, hoyISO } from "@/lib/format";
import { rangoDePreset, moverRango, type PresetRango } from "@/lib/panelDates";

interface FilaResumen {
  profesional_id: number;
  nombre: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  citas_atendidas: number;
  facturacion_total: number;
  comision_a_pagar: number;
}

interface Config {
  profesional_id: number;
  nombre: string;
  tipo: "porcentaje" | "monto_fijo" | null;
  valor: number | null;
}

interface CitaDeComision {
  cita_id: number;
  fecha: string;
  hora_inicio: string;
  servicio: string | null;
  cliente: string | null;
  precio_final: number;
  comision: number;
}

interface Detalle {
  citas: CitaDeComision[];
  total_facturado: number;
  total_comision: number;
}

interface Respuesta {
  desde: string;
  hasta: string;
  config: Config[];
  resumen: FilaResumen[];
  total_a_pagar: number;
  total_facturado: number;
}

const OPCIONES: Array<{ id: PresetRango; label: string }> = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

const fmtDia = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

export default function ComisionesPage() {
  const [preset, setPreset] = useState<PresetRango>("mes");
  const [ancla, setAncla] = useState(hoyISO());
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<{ tipo: "porcentaje" | "monto_fijo"; valor: string }>({
    tipo: "porcentaje",
    valor: "",
  });
  // Detalle por profesional: se pide recién al desplegar, no de entrada.
  const [abierto, setAbierto] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Record<number, Detalle | "cargando">>({});

  const cargar = useCallback(async (desde: string, hasta: string) => {
    setCargando(true);
    setError(null);
    setDetalle({});
    try {
      const r = await fetch(`/api/comisiones?desde=${desde}&hasta=${hasta}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudieron cargar las comisiones.");
      setDatos(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, []);

  const rango = rangoDePreset(preset, ancla);
  const { desde, hasta } = rango;

  useEffect(() => {
    cargar(desde, hasta);
  }, [desde, hasta, cargar]);

  /** El detalle se pide una vez por profesional y queda cacheado hasta que cambie el rango. */
  async function alternarDetalle(profesionalId: number) {
    if (abierto === profesionalId) return setAbierto(null);
    setAbierto(profesionalId);
    if (detalle[profesionalId]) return;
    setDetalle((d) => ({ ...d, [profesionalId]: "cargando" }));
    try {
      const r = await fetch(`/api/comisiones/${profesionalId}?desde=${desde}&hasta=${hasta}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDetalle((d) => ({ ...d, [profesionalId]: j }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDetalle((d) => { const n = { ...d }; delete n[profesionalId]; return n; });
      setAbierto(null);
    }
  }

  function empezarEdicion(c: Config) {
    setEditando(c.profesional_id);
    setBorrador({ tipo: c.tipo ?? "porcentaje", valor: c.valor != null ? String(c.valor) : "" });
    setError(null);
  }

  async function guardar(profesionalId: number) {
    const valor = Number(borrador.valor);
    if (!Number.isFinite(valor) || valor < 0) return setError("El valor tiene que ser un número positivo.");
    if (borrador.tipo === "porcentaje" && valor > 100) {
      return setError("Un porcentaje no puede superar 100.");
    }

    setError(null);
    const r = await fetch("/api/comisiones", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profesional_id: profesionalId, tipo: borrador.tipo, valor }),
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    setEditando(null);
    await cargar(desde, hasta);
  }

  const sinConfigurar = datos?.config.filter((c) => c.tipo === null) ?? [];

  return (
    <PantallaPanel
      titulo="Comisiones"
      descripcion={`${fmtDia(desde)} — ${fmtDia(hasta)} · solo citas atendidas`}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <SelectorRango preset={preset} opciones={OPCIONES} onPreset={setPreset} />
          <div className="flex items-center gap-1.5">
            <Boton tipo="secundario" chico onClick={() => setAncla(moverRango(preset, ancla, -1))}>←</Boton>
            <Boton tipo="secundario" chico onClick={() => setAncla(moverRango(preset, ancla, 1))}>→</Boton>
            {ancla !== hoyISO() && (
              <Boton tipo="secundario" chico onClick={() => setAncla(hoyISO())}>Hoy</Boton>
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

      {cargando && !datos ? (
        <p className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</p>
      ) : !datos ? null : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Metrica
              etiqueta="Facturado en el período"
              valor={plata(datos.total_facturado)}
              detalle="Suma de las citas atendidas"
            />
            <Metrica
              etiqueta="Total a pagar"
              valor={plata(datos.total_a_pagar)}
              tono="acento"
              detalle="Comisiones de todo el equipo"
            />
            <Metrica
              etiqueta="Queda para el negocio"
              valor={plata(datos.total_facturado - datos.total_a_pagar)}
              tono="exito"
              detalle="Facturación menos comisiones"
            />
          </div>

          <Tarjeta>
            <TituloSeccion>Resumen del período</TituloSeccion>
            {datos.resumen.length === 0 ? (
              <Vacio>No hay profesionales activos.</Vacio>
            ) : (
              <>
                {/* Mobile: la tabla de escritorio deja "A pagar" — el número
                    que define cuánto pagarle a cada uno, y la razón por la
                    que se entra a esta pantalla — detrás de scroll
                    horizontal sin ningún indicio de que hay más columnas
                    (tabla de 560px en ~286px visibles, medido). En vez de
                    reordenar columnas de la MISMA tabla (que tocaría también
                    el escritorio), va una lista de tarjetas aparte, solo
                    para mobile, con nombre + A pagar siempre visibles. */}
                <ul className="md:hidden divide-y divide-[var(--color-wa-sep)]">
                  {datos.resumen.map((r) => {
                    const d = detalle[r.profesional_id];
                    const desplegado = abierto === r.profesional_id;
                    return (
                      <li key={r.profesional_id}>
                        <button
                          onClick={() => alternarDetalle(r.profesional_id)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <svg
                              className={`w-3 h-3 shrink-0 text-[var(--color-wa-text-sec)] transition-transform duration-150 ${desplegado ? "rotate-90" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-semibold text-sm text-[var(--color-wa-text-main)] truncate">
                              {r.nombre}
                            </span>
                          </span>
                          <span className="tnum text-base font-bold shrink-0" style={{ color: "var(--color-wa-green)" }}>
                            {plata(r.comision_a_pagar)}
                          </span>
                        </button>
                        <div className="px-4 pb-3 -mt-1 pl-9 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--color-wa-text-sec)]">
                          <span>{r.tipo === "monto_fijo" ? `${plata(r.valor)} por cita` : `${r.valor}%`}</span>
                          <span>·</span>
                          <span>{r.citas_atendidas} cita{r.citas_atendidas === 1 ? "" : "s"}</span>
                          <span>·</span>
                          <span>{plata(r.facturacion_total)} facturado</span>
                        </div>

                        {desplegado && (
                          <div className="px-4 pb-4 pl-9 bg-[var(--color-wa-bg-main)]">
                            {d === "cargando" || !d ? (
                              <p className="text-sm text-[var(--color-wa-text-sec)] py-2">Cargando el detalle…</p>
                            ) : d.citas.length === 0 ? (
                              <p className="text-sm text-[var(--color-wa-text-sec)] py-2">
                                Sin citas atendidas en este período.
                              </p>
                            ) : (
                              <ul className="divide-y divide-[var(--color-wa-sep)]">
                                {d.citas.map((c) => (
                                  <li key={c.cita_id} className="py-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-[var(--color-wa-text-sec)] capitalize whitespace-nowrap">
                                        {fmtDia(c.fecha)} · {c.hora_inicio}
                                      </span>
                                      <span className="tnum text-sm font-bold shrink-0" style={{ color: "var(--color-wa-green)" }}>
                                        {plata(c.comision)}
                                      </span>
                                    </div>
                                    {/* Sin truncate: el nombre del cliente es
                                        el mismo dato que se arregló en
                                        "Por cobrar" (Caja) — cortado a la
                                        mitad, dos citas distintas se leen
                                        igual. */}
                                    <p className="text-sm text-[var(--color-wa-text-main)]">
                                      {c.servicio ?? "—"}
                                      {c.cliente ? ` · ${c.cliente}` : ""}
                                    </p>
                                    <p className="text-xs text-[var(--color-wa-text-sec)]">
                                      {plata(c.precio_final)} facturado
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                  <li className="flex items-center justify-between gap-3 px-4 py-3 font-bold text-[var(--color-wa-text-main)] border-t-2 border-[var(--color-wa-sep)]">
                    <span>Total</span>
                    <span className="tnum" style={{ color: "var(--color-wa-green)" }}>
                      {plata(datos.total_a_pagar)}
                    </span>
                  </li>
                </ul>

                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
                      <th className="text-left px-4 md:px-5 py-2.5">Profesional</th>
                      <th className="text-left px-3 py-2.5">Comisión</th>
                      <th className="text-right px-3 py-2.5">Citas</th>
                      <th className="text-right px-3 py-2.5">Facturado</th>
                      <th className="text-right px-4 md:px-5 py-2.5">A pagar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-wa-sep)]">
                    {datos.resumen.map((r) => {
                      const d = detalle[r.profesional_id];
                      const desplegado = abierto === r.profesional_id;
                      return (
                      <Fragment key={r.profesional_id}>
                      <tr
                        onClick={() => alternarDetalle(r.profesional_id)}
                        className="cursor-pointer hover:bg-[var(--color-wa-hover)] transition-colors"
                      >
                        <td className="px-4 md:px-5 py-3 font-semibold text-[var(--color-wa-text-main)]">
                          <span className="inline-flex items-center gap-2">
                            <svg
                              className={`w-3 h-3 text-[var(--color-wa-text-sec)] transition-transform duration-150 ${desplegado ? "rotate-90" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            {r.nombre}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[var(--color-wa-text-sec)]">
                          {r.tipo === "monto_fijo"
                            ? `${plata(r.valor)} por cita`
                            : `${r.valor}%`}
                        </td>
                        <td className="tnum px-3 py-3 text-right text-[var(--color-wa-text-main)]">
                          {r.citas_atendidas}
                        </td>
                        <td className="tnum px-3 py-3 text-right text-[var(--color-wa-text-main)]">
                          {plata(r.facturacion_total)}
                        </td>
                        <td
                          className="tnum px-4 md:px-5 py-3 text-right font-bold"
                          style={{ color: "var(--color-wa-green)" }}
                        >
                          {plata(r.comision_a_pagar)}
                        </td>
                      </tr>

                      {desplegado && (
                        <tr>
                          <td colSpan={5} className="px-4 md:px-5 pb-4 bg-[var(--color-wa-bg-main)]">
                            {d === "cargando" || !d ? (
                              <p className="text-sm text-[var(--color-wa-text-sec)] py-3">Cargando el detalle…</p>
                            ) : d.citas.length === 0 ? (
                              <p className="text-sm text-[var(--color-wa-text-sec)] py-3">
                                Sin citas atendidas en este período.
                              </p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
                                    <th className="text-left py-2">Fecha</th>
                                    <th className="text-left py-2">Servicio</th>
                                    <th className="text-left py-2">Cliente</th>
                                    <th className="text-right py-2">Precio</th>
                                    <th className="text-right py-2">Comisión</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-wa-sep)]">
                                  {d.citas.map((c) => (
                                    <tr key={c.cita_id}>
                                      <td className="py-2 text-[var(--color-wa-text-sec)] capitalize whitespace-nowrap">
                                        {fmtDia(c.fecha)} · {c.hora_inicio}
                                      </td>
                                      <td className="py-2 text-[var(--color-wa-text-main)]">{c.servicio ?? "—"}</td>
                                      <td className="py-2 text-[var(--color-wa-text-sec)]">{c.cliente ?? "—"}</td>
                                      <td className="tnum py-2 text-right text-[var(--color-wa-text-main)]">
                                        {plata(c.precio_final)}
                                      </td>
                                      <td className="tnum py-2 text-right" style={{ color: "var(--color-wa-green)" }}>
                                        {plata(c.comision)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-[var(--color-wa-sep)]">
                                    <td className="py-2 font-bold text-[var(--color-wa-text-main)]" colSpan={3}>
                                      {d.citas.length} cita{d.citas.length === 1 ? "" : "s"}
                                    </td>
                                    <td className="tnum py-2 text-right font-bold text-[var(--color-wa-text-main)]">
                                      {plata(d.total_facturado)}
                                    </td>
                                    <td className="tnum py-2 text-right font-bold" style={{ color: "var(--color-wa-green)" }}>
                                      {plata(d.total_comision)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-wa-sep)]">
                      <td className="px-4 md:px-5 py-3 font-bold text-[var(--color-wa-text-main)]" colSpan={3}>
                        Total
                      </td>
                      <td className="tnum px-3 py-3 text-right font-bold text-[var(--color-wa-text-main)]">
                        {plata(datos.total_facturado)}
                      </td>
                      <td
                        className="tnum px-4 md:px-5 py-3 text-right font-bold"
                        style={{ color: "var(--color-wa-green)" }}
                      >
                        {plata(datos.total_a_pagar)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </>
            )}
          </Tarjeta>

          <Tarjeta>
            <TituloSeccion
              extra={
                sinConfigurar.length > 0 ? (
                  <span className="text-xs" style={{ color: "var(--color-wa-alerta)" }}>
                    {sinConfigurar.length} sin comisión configurada
                  </span>
                ) : undefined
              }
            >
              Configuración por profesional
            </TituloSeccion>
            <ul className="divide-y divide-[var(--color-wa-sep)]">
              {datos.config.map((c) => (
                <li
                  key={c.profesional_id}
                  className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3"
                >
                  <span className="font-semibold text-sm text-[var(--color-wa-text-main)] flex-1 min-w-[120px]">
                    {c.nombre}
                  </span>

                  {editando === c.profesional_id ? (
                    <>
                      <select
                        value={borrador.tipo}
                        onChange={(e) =>
                          setBorrador({
                            ...borrador,
                            tipo: e.target.value as "porcentaje" | "monto_fijo",
                          })
                        }
                        className={claseInput}
                      >
                        <option value="porcentaje">Porcentaje</option>
                        <option value="monto_fijo">Monto fijo por cita</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={borrador.valor}
                        onChange={(e) => setBorrador({ ...borrador, valor: e.target.value })}
                        className={`${claseInput} tnum w-28`}
                        placeholder={borrador.tipo === "porcentaje" ? "35" : "2000"}
                      />
                      <Boton chico onClick={() => guardar(c.profesional_id)}>
                        Guardar
                      </Boton>
                      <Boton tipo="secundario" chico onClick={() => setEditando(null)}>
                        Cancelar
                      </Boton>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-[var(--color-wa-text-sec)]">
                        {c.tipo === null ? (
                          <em style={{ color: "var(--color-wa-alerta)" }}>Sin configurar</em>
                        ) : c.tipo === "monto_fijo" ? (
                          `${plata(c.valor)} por cita atendida`
                        ) : (
                          `${c.valor}% de lo facturado`
                        )}
                      </span>
                      <Boton tipo="secundario" chico onClick={() => empezarEdicion(c)}>
                        Editar
                      </Boton>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>
      )}
    </PantallaPanel>
  );
}
