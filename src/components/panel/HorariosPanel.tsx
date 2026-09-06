"use client";

import { useState, useEffect, useCallback } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { campoHora, campoFecha, campoTextoChico } from "@/components/panel/PanelChrome";
import { waLink } from "@/lib/format";

/**
 * Todo lo que define cuándo se puede reservar, en una pantalla.
 *
 * Antes esto vivía en tres lugares: Config → Horarios (solo lectura), Config →
 * Días cerrados, y Personal → Disponibilidad. Cerrar mañana por feriado
 * obligaba a saltar entre secciones para una sola decisión operativa.
 *
 * Los tres bloques, de arriba abajo:
 *
 *   1. HORARIO DEL NEGOCIO   el techo. Editable. Ningún profesional puede
 *                            tener disponibilidad fuera de este rango.
 *   2. QUIÉN ATIENDE         la grilla profesional × día. Es la fuente de
 *                            verdad de los turnos; el techo solo la limita.
 *   3. DÍAS CERRADOS         feriados y cierres puntuales, con los turnos que
 *                            quedan adentro a la vista.
 */

const DIAS = [
  { dow: 1, corto: "Lun", largo: "lunes" },
  { dow: 2, corto: "Mar", largo: "martes" },
  { dow: 3, corto: "Mié", largo: "miércoles" },
  { dow: 4, corto: "Jue", largo: "jueves" },
  { dow: 5, corto: "Vie", largo: "viernes" },
  { dow: 6, corto: "Sáb", largo: "sábado" },
  { dow: 0, corto: "Dom", largo: "domingo" },
];

// Los campos de fecha y hora salen de PanelChrome (campoHora / campoFecha):
// es el mismo estilo en todo el panel y con el alto fijo para que date y time
// midan igual.
const BTN =
  "px-4 py-2 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all";
const BTN_SEC =
  "px-4 py-2 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-hover)] active:scale-95 transition-all";

type Rango = { apertura: string | null; cierre: string | null };
type Techo = Record<number, Rango>;

interface Franja { dia_semana: number; hora_inicio: string; hora_fin: string }
interface Prof { id: number; nombre: string; activo: number; disponibilidad: Franja[] }
interface Conflicto {
  profesional_id: number; profesional_nombre: string; dia_semana: number;
  hora_inicio: string; hora_fin: string; motivo: string;
}
interface Cierre {
  id: number; desde: string; hasta: string;
  hora_desde: string | null; hora_hasta: string | null; motivo: string | null;
}
interface CitaAfectada {
  id: number; fecha: string; hora_inicio: string;
  cliente_nombre: string | null; cliente_telefono: string | null;
  servicio_nombre: string | null; profesional_nombre: string | null;
}

const hoyISO = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

const mañanaISO = () => {
  const d = new Date(`${hoyISO()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

export function HorariosPanel({ onSaved }: { onSaved: (msg?: string) => void }) {
  const [techo, setTecho] = useState<Techo>({});
  const [profs, setProfs] = useState<Prof[]>([]);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [cargando, setCargando] = useState(true);

  const [guardandoTecho, setGuardandoTecho] = useState(false);
  const [conflictos, setConflictos] = useState<Conflicto[] | null>(null);
  const [errorTecho, setErrorTecho] = useState("");

  const [editando, setEditando] = useState<{ prof: number; dow: number } | null>(null);
  const [errorGrilla, setErrorGrilla] = useState("");

  const [nuevo, setNuevo] = useState({ desde: "", hasta: "", motivo: "", medioDia: false, horaDesde: "", horaHasta: "" });
  const [afectados, setAfectados] = useState<CitaAfectada[]>([]);
  const [borrarId, setBorrarId] = useState<number | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [avisos, setAvisos] = useState<CitaAfectada[]>([]);

  const cargar = useCallback(async () => {
    const [t, p, c] = await Promise.all([
      fetch("/api/settings/horario-negocio").then((r) => r.json()),
      fetch("/api/settings/profesionales").then((r) => r.json()),
      fetch("/api/settings/dias-cerrados").then((r) => r.json()),
    ]);
    setTecho(t.horario ?? {});
    setProfs((Array.isArray(p) ? p : []).filter((x: Prof) => x.activo !== 0));
    setCierres(Array.isArray(c) ? c : []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── 1. Techo ──────────────────────────────────────────────────────────────
  const cambiarTecho = (dow: number, campo: "apertura" | "cierre", valor: string) =>
    setTecho((t) => ({ ...t, [dow]: { ...t[dow], [campo]: valor } }));

  const alternarDia = (dow: number) =>
    setTecho((t) => ({
      ...t,
      [dow]: t[dow]?.apertura ? { apertura: null, cierre: null } : { apertura: "09:00", cierre: "20:00" },
    }));

  const guardarTecho = async (recortar = false) => {
    setGuardandoTecho(true);
    setErrorTecho("");
    const r = await fetch("/api/settings/horario-negocio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horario: techo, recortar }),
    });
    const body = await r.json().catch(() => ({}));
    setGuardandoTecho(false);

    if (r.status === 409) { setConflictos(body.conflictos ?? []); return; }
    if (!r.ok) { setErrorTecho(body.error ?? "No se pudo guardar."); return; }
    setConflictos(null);
    await cargar();
    onSaved(recortar ? "Horario guardado y disponibilidad recortada." : "Horario del negocio guardado.");
  };

  // ── 2. Grilla ─────────────────────────────────────────────────────────────
  const franjaDe = (p: Prof, dow: number) => p.disponibilidad.find((f) => f.dia_semana === dow);

  const guardarFranja = async (prof: Prof, dow: number, inicio: string | null, fin: string | null) => {
    setErrorGrilla("");
    const resto = prof.disponibilidad.filter((f) => f.dia_semana !== dow);
    const nueva = inicio && fin
      ? [...resto, { dia_semana: dow, hora_inicio: inicio, hora_fin: fin }]
      : resto;

    const r = await fetch(`/api/settings/profesionales/${prof.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponibilidad: nueva }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const rech = body.rechazadas?.[0];
      const t = rech?.techo;
      setErrorGrilla(
        rech?.motivo === "dia_cerrado"
          ? `El negocio no abre los ${DIAS.find((d) => d.dow === dow)?.largo}. Cambiá el horario general primero.`
          : rech?.motivo === "horario_invalido"
          ? "El cierre tiene que ser posterior a la apertura."
          : `Fuera del horario del negocio (${t?.apertura}–${t?.cierre}).`
      );
      return;
    }
    setEditando(null);
    await cargar();
    onSaved("Disponibilidad actualizada.");
  };

  // ── 3. Días cerrados ──────────────────────────────────────────────────────
  const verAfectados = useCallback(async (desde: string, hasta: string, hd: string, hh: string) => {
    if (!desde) { setAfectados([]); return; }
    const q = new URLSearchParams({ desde });
    if (hasta) q.set("hasta", hasta);
    if (hd) q.set("hora_desde", hd);
    if (hh) q.set("hora_hasta", hh);
    const r = await fetch(`/api/settings/dias-cerrados/afectados?${q}`).then((x) => x.json());
    setAfectados(r.afectados ?? []);
  }, []);

  useEffect(() => {
    verAfectados(nuevo.desde, nuevo.hasta, nuevo.medioDia ? nuevo.horaDesde : "", nuevo.medioDia ? nuevo.horaHasta : "");
  }, [nuevo, verAfectados]);

  const cerrarMañana = () => setNuevo({ desde: mañanaISO(), hasta: "", motivo: "Feriado", medioDia: false, horaDesde: "", horaHasta: "" });

  const agregarCierre = async () => {
    if (!nuevo.desde) return;
    const r = await fetch("/api/settings/dias-cerrados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desde: nuevo.desde,
        hasta: nuevo.hasta || undefined,
        motivo: nuevo.motivo,
        hora_desde: nuevo.medioDia ? nuevo.horaDesde || null : null,
        hora_hasta: nuevo.medioDia ? nuevo.horaHasta || null : null,
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { onSaved(body.error ?? "No se pudo cerrar."); return; }
    setNuevo({ desde: "", hasta: "", motivo: "", medioDia: false, horaDesde: "", horaHasta: "" });
    await cargar();
    onSaved("Día cerrado. Los turnos que ya estaban siguen en pie.");
  };

  const cancelarAfectados = async () => {
    setCancelando(true);
    const r = await fetch("/api/settings/dias-cerrados/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: afectados.map((a) => a.id) }),
    });
    const body = await r.json().catch(() => ({}));
    setCancelando(false);
    if (r.ok) {
      setAvisos(body.cancelados ?? []);
      setAfectados([]);
      onSaved(`${body.cancelados?.length ?? 0} turno(s) cancelado(s). Falta avisarles.`);
    }
  };

  if (cargando) return <div className="h-96 animate-pulse bg-[var(--color-wa-hover)] rounded-2xl" />;

  const diaCerradoEnTecho = (dow: number) => !techo[dow]?.apertura;
  const fueraDelTecho = (dow: number, f?: Franja) => {
    if (!f) return false;
    const t = techo[dow];
    if (!t?.apertura || !t?.cierre) return true;
    return f.hora_inicio < t.apertura || f.hora_fin > t.cierre;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Horario del negocio ─────────────────────────────────────── */}
      <Bloque titulo="Horario del negocio" bajada="El techo: nadie puede tener disponibilidad fuera de este rango.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {DIAS.map(({ dow, largo }) => {
            const r = techo[dow] ?? { apertura: null, cierre: null };
            const abierto = !!r.apertura;
            return (
              <div key={dow} className="flex items-center gap-2 py-1">
                <button
                  onClick={() => alternarDia(dow)}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${abierto ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`}
                  aria-label={`${abierto ? "Cerrar" : "Abrir"} los ${largo}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${abierto ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-[var(--color-wa-text-main)] capitalize w-20">{largo}</span>
                {abierto ? (
                  <>
                    <input type="time" className={campoHora} value={r.apertura ?? ""} onChange={(e) => cambiarTecho(dow, "apertura", e.target.value)} />
                    <span className="text-[var(--color-wa-text-sec)] text-xs">–</span>
                    <input type="time" className={campoHora} value={r.cierre ?? ""} onChange={(e) => cambiarTecho(dow, "cierre", e.target.value)} />
                  </>
                ) : (
                  <span className="text-xs text-[var(--color-wa-text-sec)]">cerrado</span>
                )}
              </div>
            );
          })}
        </div>

        {errorTecho && <p className="mt-3 text-sm text-red-500">{errorTecho}</p>}

        {conflictos && (
          <div className="mt-4 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Con este horario quedaría gente afuera:
            </p>
            <ul className="mt-2 text-sm text-amber-900 dark:text-amber-200 space-y-0.5">
              {conflictos.map((c, i) => (
                <li key={i}>
                  {c.profesional_nombre} · {DIAS.find((d) => d.dow === c.dia_semana)?.largo} {c.hora_inicio}–{c.hora_fin}
                  {c.motivo === "dia_cerrado" && " (día que pasaría a estar cerrado)"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
              Recortar ajusta esas franjas al nuevo horario. No se hace solo.
            </p>
            <div className="flex gap-2 mt-3">
              <button className={BTN} onClick={() => guardarTecho(true)} disabled={guardandoTecho}>Recortar y guardar</button>
              <button className={BTN_SEC} onClick={() => { setConflictos(null); cargar(); }}>Cancelar</button>
            </div>
          </div>
        )}

        {!conflictos && (
          <div className="mt-4">
            <button className={BTN} onClick={() => guardarTecho(false)} disabled={guardandoTecho}>
              {guardandoTecho ? "Guardando…" : "Guardar horario"}
            </button>
          </div>
        )}
      </Bloque>

      {/* ── 2. Grilla ──────────────────────────────────────────────────── */}
      <Bloque titulo="Quién atiende y cuándo" bajada="De acá salen los turnos. Click en una celda para editar.">
        {errorGrilla && (
          <p className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-sm text-red-600 dark:text-red-400">{errorGrilla}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left font-semibold text-[var(--color-wa-text-sec)] text-xs uppercase tracking-wider py-2 pr-3">Profesional</th>
                {DIAS.map((d) => (
                  <th key={d.dow} className={`text-center font-semibold text-xs uppercase tracking-wider py-2 px-1 ${diaCerradoEnTecho(d.dow) ? "text-[var(--color-wa-text-sec)]/50" : "text-[var(--color-wa-text-sec)]"}`}>
                    {d.corto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profs.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-wa-sep)]">
                  <td className="py-2 pr-3 text-[var(--color-wa-text-main)] font-medium whitespace-nowrap">{p.nombre}</td>
                  {DIAS.map((d) => {
                    const f = franjaDe(p, d.dow);
                    const mal = fueraDelTecho(d.dow, f);
                    const edit = editando?.prof === p.id && editando?.dow === d.dow;
                    return (
                      <td key={d.dow} className="py-1.5 px-1 text-center">
                        {edit ? (
                          <CeldaEditor
                            inicial={f}
                            techo={techo[d.dow]}
                            onGuardar={(i, fi) => guardarFranja(p, d.dow, i, fi)}
                            onCancelar={() => { setEditando(null); setErrorGrilla(""); }}
                          />
                        ) : (
                          <button
                            onClick={() => { setEditando({ prof: p.id, dow: d.dow }); setErrorGrilla(""); }}
                            className={`w-full px-1.5 py-1 rounded-lg text-xs tabular-nums transition-colors ${
                              mal
                                ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold"
                                : f
                                ? "text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)]"
                                : "text-[var(--color-wa-text-sec)]/60 hover:bg-[var(--color-wa-hover)]"
                            }`}
                            title={mal ? "Fuera del horario del negocio" : "Editar"}
                          >
                            {f ? `${f.hora_inicio}–${f.hora_fin}` : "—"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {profs.length === 0 && (
          <p className="text-sm text-[var(--color-wa-text-sec)] py-2">No hay profesionales activos.</p>
        )}
      </Bloque>

      {/* ── 3. Días cerrados ───────────────────────────────────────────── */}
      <Bloque titulo="Días cerrados" bajada="Feriados y cierres puntuales. Aplican a todo el negocio.">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--color-wa-text-sec)] uppercase tracking-wider">Desde</span>
            <input type="date" className={campoFecha} min={hoyISO()} value={nuevo.desde}
              onChange={(e) => setNuevo({ ...nuevo, desde: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--color-wa-text-sec)] uppercase tracking-wider">Hasta (opcional)</span>
            <input type="date" className={campoFecha} min={nuevo.desde || hoyISO()} value={nuevo.hasta}
              onChange={(e) => setNuevo({ ...nuevo, hasta: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <span className="text-[11px] text-[var(--color-wa-text-sec)] uppercase tracking-wider">Motivo</span>
            <input type="text" className={`${campoTextoChico} w-full`} placeholder="Feriado" value={nuevo.motivo}
              onChange={(e) => setNuevo({ ...nuevo, motivo: e.target.value })} />
          </label>
          <button className={BTN_SEC} onClick={cerrarMañana}>Cerrar mañana</button>
          <button className={BTN} onClick={agregarCierre} disabled={!nuevo.desde}>Cerrar</button>
        </div>

        <label className="flex items-center gap-2 mb-3 text-xs text-[var(--color-wa-text-sec)]">
          <input type="checkbox" checked={nuevo.medioDia}
            onChange={(e) => setNuevo({ ...nuevo, medioDia: e.target.checked })} />
          Solo una parte del día
          {nuevo.medioDia && (
            <>
              <input type="time" className={campoHora} value={nuevo.horaDesde}
                onChange={(e) => setNuevo({ ...nuevo, horaDesde: e.target.value })} />
              <span>–</span>
              <input type="time" className={campoHora} value={nuevo.horaHasta}
                onChange={(e) => setNuevo({ ...nuevo, horaHasta: e.target.value })} />
            </>
          )}
        </label>

        {afectados.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {afectados.length} turno(s) ya reservado(s) en esas fechas.
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              Cerrar el día frena reservas nuevas, pero estos siguen en pie y el cliente se va a presentar.
            </p>
            <ul className="mt-2 text-sm text-amber-900 dark:text-amber-200 space-y-0.5">
              {afectados.slice(0, 8).map((a) => (
                <li key={a.id}>
                  {a.fecha} {a.hora_inicio} · {a.cliente_nombre ?? "sin nombre"} · {a.servicio_nombre ?? "—"} · {a.profesional_nombre ?? "—"}
                </li>
              ))}
              {afectados.length > 8 && <li>…y {afectados.length - 8} más.</li>}
            </ul>
            <button className={`${BTN_SEC} mt-3`} onClick={cancelarAfectados} disabled={cancelando}>
              {cancelando ? "Cancelando…" : `Cancelar los ${afectados.length} turnos`}
            </button>
          </div>
        )}

        {avisos.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-[var(--color-wa-sep)] bg-[var(--color-wa-bg-main)]">
            <p className="text-sm font-semibold text-[var(--color-wa-text-main)]">Falta avisarles</p>
            <p className="text-xs text-[var(--color-wa-text-sec)] mt-1">
              Los turnos ya están cancelados. El aviso se manda a mano, uno por uno.
            </p>
            <div className="flex flex-col gap-1 mt-2">
              {avisos.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--color-wa-text-main)]">{a.cliente_nombre ?? "sin nombre"}</span>
                  <span className="text-[var(--color-wa-text-sec)] text-xs">{a.fecha} {a.hora_inicio}</span>
                  {a.cliente_telefono ? (
                    <a href={waLink(a.cliente_telefono)} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-full bg-[#25D366]/10 text-[#25D366] font-bold hover:bg-[#25D366] hover:text-white transition-colors">
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--color-wa-text-sec)]">sin teléfono</span>
                  )}
                </div>
              ))}
            </div>
            <button className={`${BTN_SEC} mt-3`} onClick={() => setAvisos([])}>Listo</button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {cierres.length === 0 && (
            <p className="text-sm text-[var(--color-wa-text-sec)] py-2">No hay días cerrados registrados.</p>
          )}
          {cierres.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
              <div className="flex-1 min-w-0">
                {/* first-letter y no capitalize: es-AR devuelve "lunes, 31 de agosto"
                    y capitalize lo dejaba como "Lunes, 31 De Agosto". */}
                <p className="text-sm font-medium text-[var(--color-wa-text-main)] first-letter:uppercase">
                  {c.desde === c.hasta ? fechaLarga(c.desde) : `${fechaLarga(c.desde)} — ${fechaLarga(c.hasta)}`}
                  {c.hora_desde && <span className="text-[var(--color-wa-text-sec)]"> · {c.hora_desde}–{c.hora_hasta ?? ""}</span>}
                </p>
                {c.motivo && <p className="text-xs text-[var(--color-wa-text-sec)]">{c.motivo}</p>}
              </div>
              <button onClick={() => setBorrarId(c.id)}
                className="p-1.5 rounded-lg text-[var(--color-wa-text-sec)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </Bloque>

      {borrarId !== null && (
        <ConfirmDialog
          message="¿Volver a abrir estas fechas?"
          onConfirm={async () => {
            await fetch(`/api/settings/dias-cerrados/${borrarId}`, { method: "DELETE" });
            setBorrarId(null);
            await cargar();
          }}
          onCancel={() => setBorrarId(null)}
        />
      )}
    </div>
  );
}

function Bloque({ titulo, bajada, children }: { titulo: string; bajada: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-wa-sep)]">
        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">{titulo}</h3>
        <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">{bajada}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Editor de una celda de la grilla. Vacío = ese día no trabaja. */
function CeldaEditor({
  inicial, techo, onGuardar, onCancelar,
}: {
  inicial?: Franja;
  techo?: Rango;
  onGuardar: (inicio: string | null, fin: string | null) => void;
  onCancelar: () => void;
}) {
  const [inicio, setInicio] = useState(inicial?.hora_inicio ?? techo?.apertura ?? "09:00");
  const [fin, setFin] = useState(inicial?.hora_fin ?? techo?.cierre ?? "18:00");

  return (
    <div className="flex flex-col gap-1 items-center">
      <input type="time" className={campoHora} value={inicio} onChange={(e) => setInicio(e.target.value)} />
      <input type="time" className={campoHora} value={fin} onChange={(e) => setFin(e.target.value)} />
      <div className="flex gap-1">
        <button onClick={() => onGuardar(inicio, fin)}
          className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] font-bold">OK</button>
        <button onClick={() => onGuardar(null, null)}
          className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]">No trabaja</button>
        <button onClick={onCancelar}
          className="text-[10px] px-2 py-0.5 rounded-full text-[var(--color-wa-text-sec)]">✕</button>
      </div>
    </div>
  );
}
