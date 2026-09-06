"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { plata } from "@/lib/format";
import { sumarDias, diasEntre, rangoDePreset, type PresetRango } from "@/lib/panelDates";
import { SelectorRango } from "@/components/panel/PanelChrome";
import { COLOR_ESTADO } from "@/components/panel/types";

/**
 * Métricas del negocio.
 *
 * No hay nada del bot acá. La estructura de WhatsApp viene heredada de Bandito
 * y está apagada, así que "Contactos", "Mensajes IA", "Conversión" y "Atención
 * manual" mostraban cero y el gráfico de mensajes salía vacío. El código del
 * bot sigue entero; lo que se sacó es medirlo donde no corre.
 *
 * Todo lo que se ve responde al selector de rango de arriba, con una excepción
 * marcada en la tarjeta: "Próximos" es un stock ("cuántos turnos tengo de acá
 * en adelante"), no un flujo, así que no tiene sentido filtrarlo por fechas.
 */

interface Comparado { valor: number; anterior: number }

interface MetricsData {
  rango: { desde: string; hasta: string; dias: number };
  rangoAnterior: { desde: string; hasta: string };
  turnos: Comparado;
  facturacion: Comparado;
  ticketPromedio: Comparado;
  perdidos: Comparado;
  clientesNuevos: Comparado;
  proximos: number;
  estados: { confirmada: number; atendida: number; cancelada: number; no_show: number };
  origen: { web: number; manual: number; bot: number };
  topServicios: Array<{ servicio: string; count: number }>;
  porProfesional: Array<{ profesional: string; turnos: number; facturacion: number }>;
  porFranja: Array<{ hora: number; count: number }>;
  citasPorDia: Array<{ fecha: string; count: number }>;
}

// ── Fechas ────────────────────────────────────────────────────────────────────

const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

const fmtShort = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};

const fmtLargo = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

// ── Barras por día ────────────────────────────────────────────────────────────

/**
 * Una barra por día del rango. Con rangos largos las barras se vuelven finitas
 * pero siguen siendo legibles como forma; el detalle exacto está en el title.
 */
function DayBars({ data, desde, hasta }: {
  data: Array<{ fecha: string; count: number }>;
  desde: string; hasta: string;
}) {
  const days = useMemo(() => {
    const n = Math.max(1, diasEntre(desde, hasta));
    return Array.from({ length: n }, (_, i) => sumarDias(desde, i));
  }, [desde, hasta]);
  const map = useMemo(() => new Map(data.map((d) => [d.fecha, d.count])), [data]);
  const values = days.map((d) => map.get(d) ?? 0);
  const max = Math.max(...values, 1);
  const hoy = hoyAR();
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-end gap-[2px] h-20 w-full mb-2">
        {days.map((date, i) => {
          const v = values[i];
          const h = v > 0 ? Math.max(4, Math.round((v / max) * 72)) : 2;
          return (
            <div
              key={date}
              className={`flex-1 rounded-sm cursor-default transition-opacity ${
                date === hoy
                  ? "bg-[var(--color-wa-green)]"
                  : v > 0
                    ? "bg-[var(--color-wa-green)] opacity-55 hover:opacity-90"
                    : "bg-[var(--color-wa-sep)] opacity-25"
              }`}
              style={{ height: `${h}px` }}
              title={`${new Date(`${date}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}: ${v} turno${v !== 1 ? "s" : ""}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-wa-text-sec)]">
        <span>{fmtShort(days[0])}</span>
        <span className={total > 0 ? "font-medium text-[var(--color-wa-text-main)]" : "italic"}>
          {total > 0
            ? `${total} turno${total !== 1 ? "s" : ""} en ${days.length} día${days.length !== 1 ? "s" : ""}`
            : "Sin turnos en este período"}
        </span>
        <span>{fmtShort(days[days.length - 1])}</span>
      </div>
    </div>
  );
}

// ── Barras horizontales genéricas ─────────────────────────────────────────────

function Barras({ filas, vacio }: {
  filas: Array<{ etiqueta: string; valor: number; detalle?: string }>;
  vacio: string;
}) {
  const max = Math.max(...filas.map((f) => f.valor), 1);
  if (!filas.length) return <p className="text-sm text-[var(--color-wa-text-sec)] py-2">{vacio}</p>;
  return (
    <div className="flex flex-col gap-3.5">
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-[var(--color-wa-text-main)] truncate pr-3">{f.etiqueta}</span>
            <span className="text-xs font-semibold text-[var(--color-wa-text-sec)] flex-shrink-0">
              {f.detalle ?? f.valor}
            </span>
          </div>
          <div className="h-1.5 bg-[var(--color-wa-sep)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(f.valor / max) * 100}%`, background: "var(--color-wa-green)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusRow({ label, count, total, hex }: { label: string; count: number; total: number; hex: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hex }} />
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-[var(--color-wa-text-main)]">{label}</span>
          <span className="text-sm font-bold text-[var(--color-wa-text-main)]">{count}</span>
        </div>
        <div className="h-1.5 bg-[var(--color-wa-sep)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: hex }} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, sub, children, className = "" }: {
  title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-[var(--color-wa-sep)]">
        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">{title}</h3>
        {sub && <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5 normal-case tracking-normal font-normal">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── KPI ───────────────────────────────────────────────────────────────────────

/**
 * `menosEsMejor` invierte el color de la variación: en "Turnos perdidos" subir
 * es malo, y pintarlo de verde porque el número creció sería una mentira.
 */
function Delta({ valor, anterior, menosEsMejor = false }: {
  valor: number; anterior: number; menosEsMejor?: boolean;
}) {
  if (anterior === 0) {
    return (
      <p className="text-[11px] text-[var(--color-wa-text-sec)] mt-1.5">
        {valor === 0 ? "sin datos en el período anterior" : "nada en el período anterior"}
      </p>
    );
  }
  const pct = Math.round(((valor - anterior) / anterior) * 100);
  const sube = pct > 0;
  const bueno = menosEsMejor ? !sube : sube;
  const color = pct === 0
    ? "text-[var(--color-wa-text-sec)]"
    : bueno ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  return (
    <p className="text-[11px] mt-1.5">
      <span className={`font-semibold ${color}`}>
        {pct === 0 ? "sin cambio" : `${sube ? "↑" : "↓"} ${Math.abs(pct)}%`}
      </span>
      <span className="text-[var(--color-wa-text-sec)]"> vs período anterior</span>
    </p>
  );
}

function Kpi({ label, value, iconHex, icon, children }: {
  label: string; value: string | number; iconHex: string;
  icon: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconHex}18`, color: iconHex }}>
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] leading-tight">{label}</span>
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none text-[var(--color-wa-text-main)]">{value}</p>
        {children}
      </div>
    </div>
  );
}

function Sk({ className }: { className: string }) {
  return <div className={`bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] rounded-2xl animate-pulse ${className}`} />;
}

const I = (d: string) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

// ── Página ────────────────────────────────────────────────────────────────────

const OPCIONES_RANGO: Array<{ id: PresetRango; label: string }> = [
  { id: "dia", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
  { id: "custom", label: "Personalizado" },
];

/**
 * `rangoDePreset` devuelve el período entero (lunes a domingo, mes completo).
 * Acá se recorta a hoy: métricas de días que todavía no pasaron ensuciarían la
 * comparación con el período anterior, que sí está cerrado.
 *
 * En Caja y Comisiones NO se recorta: ahí querés ver la semana o el mes
 * completos, incluidos los turnos ya agendados.
 */
function rangoHastaHoy(p: PresetRango) {
  const hoy = hoyAR();
  const r = rangoDePreset(p, hoy);
  return { desde: r.desde, hasta: r.hasta > hoy ? hoy : r.hasta };
}

// ── Componente ────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [preset, setPreset] = useState<PresetRango>("mes");
  const [rango, setRango] = useState(() => rangoHastaHoy("mes"));

  const load = useCallback((desde: string, hasta: string) => {
    setLoading(true);
    setError(false);
    fetch(`/api/metrics?desde=${desde}&hasta=${hasta}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(rango.desde, rango.hasta); }, [load, rango]);

  const elegirPreset = (p: PresetRango) => {
    setPreset(p);
    // "Personalizado" arranca con el rango que ya estaba a la vista, para no
    // vaciar la pantalla mientras se eligen las dos fechas.
    if (p !== "custom") setRango(rangoHastaHoy(p));
  };

  const totalEstados = data
    ? data.estados.confirmada + data.estados.atendida + data.estados.cancelada + data.estados.no_show
    : 0;
  // Las ausencias son cancelaciones: un solo renglón, como en toda la app.
  const cancelados = data ? data.estados.cancelada + data.estados.no_show : 0;
  const totalOrigen = data ? data.origen.web + data.origen.manual + data.origen.bot : 0;

  // "Bot" solo se muestra si alguna vez entró un turno por ahí: en Corte Inglés
  // el bot está apagado y una fila fija en cero es ruido.
  const origenFilas = data
    ? [
        { etiqueta: "Web", detalle: "desde la landing", valor: data.origen.web, hex: "#60a5fa" },
        { etiqueta: "Panel", detalle: "cargados a mano", valor: data.origen.manual, hex: "#a78bfa" },
        ...(data.origen.bot > 0
          ? [{ etiqueta: "Bot", detalle: "por WhatsApp", valor: data.origen.bot, hex: "#25d366" }]
          : []),
      ]
    : [];

  const franjaTop = data && data.porFranja.length
    ? data.porFranja.reduce((a, b) => (b.count > a.count ? b : a))
    : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-[1800px] mx-auto space-y-4">

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-wa-text-main)]">Métricas</h1>
              <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">
                {data
                  ? `${fmtLargo(data.rango.desde)} — ${fmtLargo(data.rango.hasta)} · ${data.rango.dias} día${data.rango.dias !== 1 ? "s" : ""}, contra ${fmtLargo(data.rangoAnterior.desde)} — ${fmtLargo(data.rangoAnterior.hasta)}`
                  : "Actividad del negocio"}
              </p>
            </div>
            <SelectorRango
              preset={preset}
              opciones={OPCIONES_RANGO}
              desde={rango.desde}
              hasta={rango.hasta}
              onPreset={elegirPreset}
              onCustom={(d, h) => setRango({ desde: d, hasta: h })}
            />
          </div>

          {error && (
            <p className="text-sm rounded-xl px-3 py-2 border border-[var(--color-wa-error)] text-[var(--color-wa-error)]">
              No se pudieron cargar las métricas.
            </p>
          )}

          {/* KPIs */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-32" />)}
            </div>
          ) : data && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi label="Turnos" value={data.turnos.valor.toLocaleString("es-AR")} iconHex="#8b5cf6"
                icon={I("M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z")}>
                <Delta valor={data.turnos.valor} anterior={data.turnos.anterior} />
              </Kpi>

              <Kpi label="Facturación" value={plata(data.facturacion.valor)} iconHex="#16a34a"
                icon={I("M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1")}>
                <Delta valor={data.facturacion.valor} anterior={data.facturacion.anterior} />
              </Kpi>

              <Kpi label="Ticket promedio" value={plata(data.ticketPromedio.valor)} iconHex="#0ea5e9"
                icon={I("M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z")}>
                <Delta valor={data.ticketPromedio.valor} anterior={data.ticketPromedio.anterior} />
              </Kpi>

              <Kpi
                label="Turnos perdidos"
                value={`${totalEstados > 0 ? Math.round((data.perdidos.valor / totalEstados) * 100) : 0}%`}
                iconHex="#ef4444"
                icon={I("M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.97l-6.93-12a2 2 0 00-3.5 0l-6.93 12A2 2 0 005.07 19z")}
              >
                <p className="text-[11px] text-[var(--color-wa-text-sec)] mt-1.5">
                  {data.perdidos.valor} cancelado{data.perdidos.valor !== 1 ? "s" : ""} o no vino
                </p>
                <Delta valor={data.perdidos.valor} anterior={data.perdidos.anterior} menosEsMejor />
              </Kpi>

              <Kpi label="Clientes nuevos" value={data.clientesNuevos.valor.toLocaleString("es-AR")} iconHex="#f59e0b"
                icon={I("M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z")}>
                <Delta valor={data.clientesNuevos.valor} anterior={data.clientesNuevos.anterior} />
              </Kpi>

              <Kpi label="Próximos" value={data.proximos.toLocaleString("es-AR")} iconHex="#06b6d4"
                icon={I("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z")}>
                {/* Único que no responde al selector: es un stock, no un flujo. */}
                <p className="text-[11px] text-[var(--color-wa-text-sec)] mt-1.5">
                  confirmados de hoy en adelante<br />
                  <span className="opacity-70">no depende del rango</span>
                </p>
              </Kpi>
            </div>
          )}

          {/* Turnos por día */}
          {loading ? <Sk className="h-40" /> : data && (
            <Card title="Turnos por día" sub="Cada barra es un día del período; hoy en verde sólido">
              <DayBars data={data.citasPorDia} desde={data.rango.desde} hasta={data.rango.hasta} />
            </Card>
          )}

          {/* Tarjetas */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-52" />)}
            </div>
          ) : data && (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">

              <Card title="Por profesional" sub="Turnos del período y lo facturado de los atendidos">
                <Barras
                  vacio="Sin turnos en este período"
                  filas={data.porProfesional.map((p) => ({
                    etiqueta: p.profesional,
                    valor: p.turnos,
                    detalle: `${p.turnos} · ${plata(p.facturacion)}`,
                  }))}
                />
              </Card>

              <Card
                title="Franja horaria"
                sub={franjaTop ? `La hora más pedida es a las ${String(franjaTop.hora).padStart(2, "0")}:00` : undefined}
              >
                <Barras
                  vacio="Sin turnos en este período"
                  filas={data.porFranja.map((f) => ({
                    etiqueta: `${String(f.hora).padStart(2, "0")}:00`,
                    valor: f.count,
                    detalle: `${f.count} turno${f.count !== 1 ? "s" : ""}`,
                  }))}
                />
              </Card>

              <Card title="Servicios más solicitados">
                <Barras
                  vacio="Sin servicios registrados en turnos"
                  filas={data.topServicios.map((s) => ({
                    etiqueta: s.servicio,
                    valor: s.count,
                    detalle: `${s.count} turno${s.count !== 1 ? "s" : ""}`,
                  }))}
                />
              </Card>

              <Card title="Estado de turnos">
                {totalEstados === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)]">Sin turnos en este período</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <StatusRow label="Confirmados" count={data.estados.confirmada} total={totalEstados} hex={COLOR_ESTADO.confirmada} />
                    <StatusRow label="Atendidos" count={data.estados.atendida} total={totalEstados} hex={COLOR_ESTADO.atendida} />
                    {/* Un solo renglón para los dos motivos: son el mismo
                        estado a nivel producto. El desglose va abajo, en
                        chico, porque el motivo sí se cuenta por separado. */}
                    <StatusRow label="Cancelados" count={cancelados} total={totalEstados} hex={COLOR_ESTADO.cancelada} />
                    {cancelados > 0 && (
                      <div className="flex flex-col gap-1 -mt-1 pl-5 text-xs text-[var(--color-wa-text-sec)]">
                        <div className="flex justify-between">
                          <span>Cancelaron el turno</span>
                          <span className="tnum font-semibold">{data.estados.cancelada}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>No vinieron</span>
                          <span className="tnum font-semibold">{data.estados.no_show}</span>
                        </div>
                      </div>
                    )}
                    <div className="pt-3 border-t border-[var(--color-wa-sep)] text-xs text-[var(--color-wa-text-sec)]">
                      Total del período: <strong className="text-[var(--color-wa-text-main)]">{totalEstados}</strong>
                    </div>
                  </div>
                )}
              </Card>

              <Card title="Origen de turnos" sub="De dónde entró cada reserva">
                {totalOrigen === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)]">Sin turnos en este período</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Cada segmento con su propio ancho. Antes se dibujaba el
                        del bot y el resto con flex-1, así que un turno entrado
                        por la web se pintaba dentro de "manual". */}
                    <div className="h-3 rounded-full overflow-hidden flex">
                      {origenFilas.filter((f) => f.valor > 0).map((f) => (
                        <div key={f.etiqueta} className="transition-all duration-700"
                          style={{ width: `${(f.valor / totalOrigen) * 100}%`, background: f.hex }} />
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      {origenFilas.map((f) => (
                        <div key={f.etiqueta} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: f.hex }} />
                            <span className="text-sm text-[var(--color-wa-text-main)]">{f.etiqueta}</span>
                            <span className="text-xs text-[var(--color-wa-text-sec)]">{f.detalle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-[var(--color-wa-text-main)]">{f.valor}</span>
                            <span className="text-xs text-[var(--color-wa-text-sec)] ml-1.5">
                              ({Math.round((f.valor / totalOrigen) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

            </div>
          )}

          {!loading && data && (
            <p className="text-[11px] text-[var(--color-wa-text-sec)] text-center pb-2">
              Datos en tiempo real desde la base · Actualizado al abrir esta sección
            </p>
          )}

        </div>
      </main>
    </div>
  );
}
