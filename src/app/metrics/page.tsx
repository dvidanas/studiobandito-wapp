"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { TopNav, BottomNav } from "@/components/TopNav";

interface MetricsData {
  contacts: { total: number; thisWeek: number; thisMonth: number };
  messages: { total: number; ai: number; byUser: number; humanHandled: number; humanInterventions: number };
  appointments: { total: number; pending: number; confirmed: number; cancelled: number; thisMonth: number; fromBot: number; fromManual: number };
  conversion: { rate: number; contactsWithAppts: number };
  topServices: Array<{ service: string; count: number }>;
  appointmentsByDay: Array<{ date: string; count: number }>;
  messagesByDay: Array<{ day: string; user: number; ai: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function genDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function fmtShort(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ── Bar chart (turnos por día) ────────────────────────────────────────────────
function DayBars({ data }: { data: Array<{ date: string; count: number }> }) {
  const days = useMemo(() => genDays(30), []);
  const map = useMemo(() => new Map(data.map(d => [d.date, d.count])), [data]);
  const values = days.map(d => map.get(d) ?? 0);
  const max = Math.max(...values, 1);
  const today = new Date().toISOString().slice(0, 10);
  const total = values.reduce((a, b) => a + b, 0);
  const hasData = total > 0;

  return (
    <div>
      <div className="flex items-end gap-[2px] h-16 w-full mb-2">
        {days.map((date, i) => {
          const v = values[i];
          const h = v > 0 ? Math.max(4, Math.round((v / max) * 56)) : 2;
          const isToday = date === today;
          return (
            <div
              key={date}
              className={`flex-1 rounded-sm cursor-default transition-opacity ${
                isToday
                  ? "bg-[var(--color-wa-green)]"
                  : v > 0
                    ? "bg-[var(--color-wa-green)] opacity-55 hover:opacity-90"
                    : "bg-[var(--color-wa-sep)] opacity-25"
              }`}
              style={{ height: `${h}px` }}
              title={`${new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}: ${v} turno${v !== 1 ? "s" : ""}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-wa-text-sec)]">
        <span>{fmtShort(days[0])}</span>
        {hasData ? (
          <span className="font-medium text-[var(--color-wa-text-main)]">{total} turno{total !== 1 ? "s" : ""} en 30 días</span>
        ) : (
          <span className="italic">Sin turnos en los últimos 30 días</span>
        )}
        <span>Hoy</span>
      </div>
    </div>
  );
}

// ── Area line chart (mensajes por día) ───────────────────────────────────────
function MessageAreaChart({ data }: { data: Array<{ day: string; user: number; ai: number }> }) {
  const days = useMemo(() => genDays(14), []);
  const map = useMemo(() => new Map(data.map(d => [d.day, d])), [data]);
  const cd = days.map(day => ({ day, user: map.get(day)?.user ?? 0, ai: map.get(day)?.ai ?? 0 }));
  const maxV = Math.max(...cd.flatMap(d => [d.user, d.ai]), 1);
  const hasData = cd.some(d => d.user > 0 || d.ai > 0);

  if (!hasData) {
    return (
      <div className="h-24 flex items-center justify-center text-sm text-[var(--color-wa-text-sec)]">
        Sin mensajes en los últimos 14 días
      </div>
    );
  }

  const W = 400, H = 64, LH = 14, N = cd.length;
  const step = N > 1 ? W / (N - 1) : W;
  const px = (i: number) => (N > 1 ? i * step : W / 2);
  const py = (v: number) => H - Math.max(0, (v / maxV) * (H - 2));

  const polyPts = (k: "user" | "ai") => cd.map((d, i) => `${px(i)},${py(d[k])}`).join(" ");
  const areaPts = (k: "user" | "ai") => {
    const inner = cd.map((d, i) => `${px(i)},${py(d[k])}`).join(" L ");
    return `M 0,${H} L ${inner} L ${W},${H} Z`;
  };

  return (
    <div>
      <div className="flex gap-5 mb-3 text-[11px] text-[var(--color-wa-text-sec)]">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background: "#60a5fa" }} />
          Mensajes recibidos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background: "#25d366" }} />
          Respuestas IA
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + LH}`} className="w-full" style={{ height: 88 }}>
        <defs>
          <linearGradient id="mGrBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="mGrGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#25d366" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#25d366" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={0} y1={H - p * H} x2={W} y2={H - p * H} stroke="currentColor" strokeOpacity={0.05} strokeWidth={1} />
        ))}
        <path d={areaPts("user")} fill="url(#mGrBlue)" />
        <path d={areaPts("ai")} fill="url(#mGrGreen)" />
        <polyline points={polyPts("user")} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polyPts("ai")} fill="none" stroke="#25d366" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {cd.map((d, i) => (
          <g key={d.day}>
            {d.user > 0 && <circle cx={px(i)} cy={py(d.user)} r={2.5} fill="#60a5fa" />}
            {d.ai > 0 && <circle cx={px(i)} cy={py(d.ai)} r={2.5} fill="#25d366" />}
          </g>
        ))}
        {cd.map((d, i) => {
          const date = new Date(d.day + "T12:00:00");
          const show = i === 0 || i === N - 1 || date.getDay() === 1;
          if (!show) return null;
          return (
            <text
              key={d.day}
              x={px(i)}
              y={H + LH - 1}
              textAnchor={i === 0 ? "start" : i === N - 1 ? "end" : "middle"}
              fontSize="9"
              fill="currentColor"
              fillOpacity={0.45}
            >
              {fmtShort(d.day)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Service bars ──────────────────────────────────────────────────────────────
function ServiceBars({ services }: { services: Array<{ service: string; count: number }> }) {
  const max = Math.max(...services.map(s => s.count), 1);
  if (!services.length) {
    return <p className="text-sm text-[var(--color-wa-text-sec)] py-2">Sin servicios registrados en turnos</p>;
  }
  return (
    <div className="flex flex-col gap-3.5">
      {services.map(s => (
        <div key={s.service}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-[var(--color-wa-text-main)] truncate pr-3">{s.service}</span>
            <span className="text-xs font-semibold text-[var(--color-wa-text-sec)] flex-shrink-0">
              {s.count} turno{s.count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="h-1.5 bg-[var(--color-wa-sep)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(s.count / max) * 100}%`, background: "var(--color-wa-green)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Status row ────────────────────────────────────────────────────────────────
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

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ title, sub, children, className = "" }: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
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

// ── KPI Card ──────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, iconHex, icon }: {
  label: string;
  value: string | number;
  sub?: string;
  iconHex: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconHex}18`, color: iconHex }}
        >
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] leading-tight">{label}</span>
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none text-[var(--color-wa-text-main)]">{value}</p>
        {sub && <p className="text-[11px] text-[var(--color-wa-text-sec)] mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ className }: { className: string }) {
  return <div className={`bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] rounded-2xl animate-pulse ${className}`} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/metrics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const apptTotal = data
    ? data.appointments.pending + data.appointments.confirmed + data.appointments.cancelled
    : 0;
  const originTotal = data ? data.appointments.fromBot + data.appointments.fromManual : 0;

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-wa-text-main)]">Métricas</h1>
              <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">Rendimiento del asistente y actividad del negocio</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)] disabled:opacity-40 transition-colors"
              title="Actualizar"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              Error al cargar las métricas. Intentá recargar.
            </div>
          )}

          {/* KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-28" />)}
            </div>
          ) : data && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi
                label="Contactos"
                value={data.contacts.total.toLocaleString("es-AR")}
                sub={`+${data.contacts.thisWeek} esta semana`}
                iconHex="#3b82f6"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              />
              <Kpi
                label="Mensajes IA"
                value={data.messages.ai.toLocaleString("es-AR")}
                sub={`de ${data.messages.total.toLocaleString("es-AR")} totales`}
                iconHex="#25d366"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              />
              <Kpi
                label="Turnos totales"
                value={data.appointments.total.toLocaleString("es-AR")}
                sub={`${data.appointments.thisMonth} este mes`}
                iconHex="#8b5cf6"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              />
              <Kpi
                label="Conversión"
                value={`${data.conversion.rate}%`}
                sub={`${data.conversion.contactsWithAppts} con turno`}
                iconHex="#f59e0b"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              />
              <Kpi
                label="Próximos"
                value={data.appointments.pending}
                sub="turnos pendientes"
                iconHex="#06b6d4"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <Kpi
                label="Atención manual"
                value={data.messages.humanInterventions}
                sub="chats tomados por humano"
                iconHex="#ef4444"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
              />
            </div>
          )}

          {/* Appointments chart */}
          {loading ? (
            <Sk className="h-36" />
          ) : data && (
            <Card title="Turnos agendados" sub="Últimos 30 días — cada barra es un día, hoy en verde sólido">
              <DayBars data={data.appointmentsByDay} />
            </Card>
          )}

          {/* Messages + Services */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Sk className="h-52" />
              <Sk className="h-52" />
            </div>
          ) : data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Actividad de mensajes" sub="Últimos 14 días">
                <MessageAreaChart data={data.messagesByDay} />
              </Card>
              <Card title="Servicios más solicitados">
                <ServiceBars services={data.topServices} />
              </Card>
            </div>
          )}

          {/* Status + Origin */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Sk className="h-44" />
              <Sk className="h-44" />
            </div>
          ) : data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Estado de turnos">
                {apptTotal === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)]">Sin turnos registrados</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <StatusRow label="Pendientes" count={data.appointments.pending} total={apptTotal} hex="#f59e0b" />
                    <StatusRow label="Confirmados" count={data.appointments.confirmed} total={apptTotal} hex="#25d366" />
                    <StatusRow label="Cancelados" count={data.appointments.cancelled} total={apptTotal} hex="#f87171" />
                    <div className="pt-3 border-t border-[var(--color-wa-sep)] flex justify-between text-xs text-[var(--color-wa-text-sec)]">
                      <span>Total registrados: <strong className="text-[var(--color-wa-text-main)]">{apptTotal}</strong></span>
                      <span>
                        Cancelación:{" "}
                        <strong className="text-[var(--color-wa-text-main)]">
                          {apptTotal > 0 ? Math.round((data.appointments.cancelled / apptTotal) * 100) : 0}%
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              <Card title="Origen de turnos">
                {originTotal === 0 ? (
                  <p className="text-sm text-[var(--color-wa-text-sec)]">Sin turnos registrados</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Split bar */}
                    <div className="h-3 rounded-full overflow-hidden flex">
                      <div
                        className="transition-all duration-700"
                        style={{
                          width: `${(data.appointments.fromBot / originTotal) * 100}%`,
                          background: "#25d366",
                        }}
                      />
                      <div className="flex-1" style={{ background: "#60a5fa" }} />
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#25d366" }} />
                          <span className="text-sm text-[var(--color-wa-text-main)]">Agendados por el bot</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[var(--color-wa-text-main)]">{data.appointments.fromBot}</span>
                          <span className="text-xs text-[var(--color-wa-text-sec)] ml-1.5">
                            ({Math.round((data.appointments.fromBot / originTotal) * 100)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#60a5fa" }} />
                          <span className="text-sm text-[var(--color-wa-text-main)]">Agendados manualmente</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[var(--color-wa-text-main)]">{data.appointments.fromManual}</span>
                          <span className="text-xs text-[var(--color-wa-text-sec)] ml-1.5">
                            ({Math.round((data.appointments.fromManual / originTotal) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-wa-text-sec)] pt-2 border-t border-[var(--color-wa-sep)]">
                      El bot automatizó el{" "}
                      <strong className="text-[var(--color-wa-text-main)]">
                        {Math.round((data.appointments.fromBot / originTotal) * 100)}%
                      </strong>{" "}
                      de los turnos
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Footer note */}
          {!loading && data && (
            <p className="text-[11px] text-[var(--color-wa-text-sec)] text-center pb-2">
              Datos en tiempo real desde la base de datos local · Actualizado al abrir esta sección
            </p>
          )}

        </div>
      </main>
      <BottomNav />
    </div>
  );
}
