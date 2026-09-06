"use client";
import { useState, useEffect, useCallback } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Acordeon, campoHora } from "@/components/panel/PanelChrome";

interface Resource {
  id: number;
  nombre: string;
  telefono: string | null;
  sucursal_id: number | null;
  activo: number;
  servicios?: number[];
}

interface AvailabilitySlot {
  id: number;
  profesional_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

interface Servicio {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const INPUT =
  "w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors";

const BTN_PRIMARY =
  "px-5 py-2.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all duration-150";

export default function StaffPage() {
  const [staff, setStaff] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  /**
   * Mobile-only: qué columna se ve, lista o detalle. En desktop las dos
   * columnas conviven siempre y esto no se lee — mismo patrón que ya usa
   * `messages/page.tsx` con `ConversationPanel` (`mobileView` + `onBack`).
   *
   * Antes de esto, `aside` y `main` eran dos columnas de un `flex` fila que
   * nunca se apilaban en mobile: `aside` medía `w-full` (todo el ancho) y
   * `flex-shrink-0`, así que a `main` no le quedaba nada — 0px de ancho,
   * medido. El tap SÍ disparaba `selectStaff` (React actualizaba el estado
   * bien), pero el panel resultante era invisible. No era un problema de área
   * táctil ni de handler faltante.
   */
  const [mobileView, setMobileView] = useState<"lista" | "detalle">("lista");

  // New staff form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Availability
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [savingAvail, setSavingAvail] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  // Qué servicios hace esta persona. Es lo que filtra el paso
  // servicio → profesional del flujo de reserva: si nadie tiene tildado un
  // servicio, ese servicio no se puede reservar con nadie.
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [misServicios, setMisServicios] = useState<number[]>([]);
  const [savingServicios, setSavingServicios] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadStaff = useCallback(() =>
    fetch("/api/settings/profesionales").then((r) => r.json()).then(setStaff), []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  useEffect(() => {
    fetch("/api/settings/servicios").then((r) => r.json()).then(setServicios);
  }, []);

  const loadDetalle = useCallback(async (id: number) => {
    const d: { disponibilidad: AvailabilitySlot[]; servicios: number[] } =
      await fetch(`/api/settings/profesionales/${id}`).then((r) => r.json());
    setAvailability(d.disponibilidad ?? []);
    setMisServicios(d.servicios ?? []);
  }, []);

  const selectStaff = (r: Resource) => {
    setSelectedId(r.id);
    setEditName(r.nombre);
    setEditPhone(r.telefono ?? "");
    setAddingNew(false);
    setAvailError(null);
    setMobileView("detalle");
    loadDetalle(r.id);
  };

  const createStaff = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/settings/profesionales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newName.trim(), telefono: newPhone.trim() || null }),
    });
    const { id } = await res.json();
    setCreating(false);
    setNewName("");
    setNewPhone("");
    setAddingNew(false);
    await loadStaff();
    const all: Resource[] = await fetch("/api/settings/profesionales").then((r) => r.json());
    const created = all.find((r) => r.id === id);
    if (created) selectStaff(created);
  };

  const saveInfo = async () => {
    if (!selectedId || !editName.trim()) return;
    setSavingInfo(true);
    await fetch(`/api/settings/profesionales/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editName.trim(), telefono: editPhone.trim() || null }),
    });
    setSavingInfo(false);
    loadStaff();
  };

  const toggleActive = async (r: Resource) => {
    await fetch(`/api/settings/profesionales/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: r.activo ? 0 : 1 }),
    });
    loadStaff();
    if (selectedId === r.id) {
      setEditName(r.nombre);
      setEditPhone(r.telefono ?? "");
    }
  };

  const confirmDeleteStaff = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/settings/profesionales/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDeleteError(data.error ?? "No se pudo eliminar.");
      setDeleteTarget(null);
      return;
    }
    // Con citas cargadas el backend desactiva en lugar de borrar, y explica por
    // qué: borrarlo dejaría el histórico de comisiones y caja apuntando a un
    // profesional inexistente.
    if (data.aviso) setDeleteError(data.aviso);
    if (selectedId === deleteTarget.id) { setSelectedId(null); setAvailability([]); setMisServicios([]); }
    setDeleteTarget(null);
    loadStaff();
  };

  const toggleDay = (day: number) => {
    if (!selectedId) return;
    const exists = availability.some((s) => s.dia_semana === day);
    setAvailability((prev) =>
      exists
        ? prev.filter((s) => s.dia_semana !== day)
        : [...prev, { id: 0, profesional_id: selectedId, dia_semana: day, hora_inicio: "09:00", hora_fin: "18:00" }]
    );
  };

  const updateTime = (day: number, field: "hora_inicio" | "hora_fin", val: string) => {
    setAvailability((prev) => prev.map((s) => s.dia_semana === day ? { ...s, [field]: val } : s));
  };

  const saveAvailability = async () => {
    if (!selectedId) return;
    setSavingAvail(true);
    setAvailError(null);
    const res = await fetch(`/api/settings/profesionales/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disponibilidad: availability.map(({ dia_semana, hora_inicio, hora_fin }) => ({ dia_semana, hora_inicio, hora_fin })),
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAvailError(d.error ?? "No se pudo guardar la disponibilidad.");
    }
    setSavingAvail(false);
  };

  const toggleServicio = (id: number) => {
    setMisServicios((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const saveServicios = async () => {
    if (!selectedId) return;
    setSavingServicios(true);
    await fetch(`/api/settings/profesionales/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servicios: misServicios }),
    });
    setSavingServicios(false);
    loadStaff();
  };

  const selected = staff.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full min-h-0">

      <div className="flex-1 flex min-h-0 md:p-3 md:gap-3 overflow-hidden">

        {/* Left sidebar. En mobile ocupa todo el ancho y se oculta entera
            cuando hay detalle a la vista — no conviven codo a codo como en
            desktop, que es lo que dejaba a `main` sin espacio. */}
        <aside
          className={`${mobileView === "detalle" ? "hidden" : "flex"} md:flex w-full md:w-[350px] flex-shrink-0 flex-col bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden md:border border-[var(--color-wa-sep)]`}
          style={{ boxShadow: "var(--shadow-card)" }}
        >

          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">Personal</span>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-1">
            {staff.length === 0 && (
              <li className="px-3 py-3 text-sm text-[var(--color-wa-text-sec)]">Sin personal aún.</li>
            )}
            {staff.map((r) => (
              <li key={r.id}>
                <div
                  onClick={() => selectStaff(r)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    selectedId === r.id ? "bg-[var(--color-wa-green)]/10" : "hover:bg-[var(--color-wa-hover)]"
                  } ${!r.activo ? "opacity-50" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${r.activo ? "bg-[var(--color-wa-green)]/15 text-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}>
                    {r.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${r.activo ? "text-[var(--color-wa-text-main)]" : "text-[var(--color-wa-text-sec)] line-through"}`}>{r.nombre}</p>
                    <p className="text-xs text-[var(--color-wa-text-sec)] truncate">
                      {r.servicios?.length
                        ? `${r.servicios.length} servicio${r.servicios.length === 1 ? "" : "s"}`
                        : "sin servicios asignados"}
                      {r.telefono ? ` · ${r.telefono}` : ""}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.activo ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`} />
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right panel. Mismo criterio que el aside: ocupa todo el ancho en
            mobile y solo se ve cuando `mobileView` apunta a "detalle". */}
        <main
          className={`${mobileView === "lista" ? "hidden" : "flex"} md:flex flex-1 min-w-0 bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden flex-col`}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Header */}
          <div className="px-4 md:px-8 py-3 flex items-center justify-between border-b border-[var(--color-wa-sep)] flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Volver a la lista. Solo tiene sentido en mobile: en desktop
                  las dos columnas están siempre a la vista. Mismo ícono y
                  mismo aria-label que usa ConversationPanel para volver de un
                  chat a la lista de conversaciones. */}
              <button
                onClick={() => setMobileView("lista")}
                className="md:hidden p-1.5 -ml-1.5 flex-shrink-0 text-[var(--color-wa-text-sec)] active:text-[var(--color-wa-text-main)]"
                aria-label="Volver"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)] truncate">Personal</h2>
            </div>
            <button
              onClick={() => { setAddingNew(true); setSelectedId(null); setMobileView("detalle"); }}
              className="text-sm font-semibold text-[var(--color-wa-green)] hover:underline flex-shrink-0"
            >
              + Agregar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
          {/* New staff form */}
          {addingNew && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Nuevo profesional</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre *</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createStaff()} className={INPUT} placeholder="Ej: Marco Alessi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Teléfono</label>
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={INPUT} placeholder="Ej: 2646123456" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createStaff} disabled={creating || !newName.trim()} className={BTN_PRIMARY}>
                  {creating ? "Guardando…" : "Crear"}
                </button>
                <button onClick={() => setAddingNew(false)} className="px-4 py-2 text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Staff detail */}
          {selected && !addingNew && (
            <>
              {/* Activar y Eliminar viven fuera del acordeon: son acciones sobre
                  la persona entera, no sobre el bloque de datos, y plegarlas
                  las dejaba a un click de distancia sin que se note que estan. */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => toggleActive(selected)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${selected.activo ? "border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:border-amber-400 hover:text-amber-500" : "border-[var(--color-wa-green)]/40 text-[var(--color-wa-green)] hover:bg-[var(--color-wa-green)]/10"}`}
                >
                  {selected.activo ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => setDeleteTarget(selected)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Eliminar
                </button>
              </div>

              {/* Info */}
              <Acordeon
                titulo="Datos del profesional"
                resumen={`${selected.nombre}${selected.telefono ? ` · ${selected.telefono}` : " · sin teléfono"}${selected.activo ? "" : " · desactivado"}`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre *</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Teléfono</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={INPUT} placeholder="Ej: 2646123456" />
                  </div>
                </div>
                <div>
                  <button onClick={saveInfo} disabled={savingInfo || !editName.trim()} className={BTN_PRIMARY}>
                    {savingInfo ? "Guardando…" : "Guardar datos"}
                  </button>
                </div>
              </Acordeon>

              <div className="border-t border-[var(--color-wa-sep)]" />

              {/* Servicios que hace */}
              <Acordeon
                titulo="Servicios que hace"
                bajada="Solo se le pueden reservar los servicios tildados. Un servicio que nadie tenga tildado no se puede reservar con nadie."
                resumen={
                  misServicios.length === 0
                    ? "sin servicios asignados"
                    : `${misServicios.length} de ${servicios.length} servicios`
                }
              >
                <div className="flex flex-wrap gap-2">
                  {servicios.length === 0 ? (
                    <p className="text-sm text-[var(--color-wa-text-sec)]">
                      No hay servicios cargados todavía.
                    </p>
                  ) : (
                    servicios.map((sv) => {
                      const activo = misServicios.includes(sv.id);
                      return (
                        <button
                          key={sv.id}
                          onClick={() => toggleServicio(sv.id)}
                          className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                            activo
                              ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] border-[var(--color-wa-green)]"
                              : "border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:border-[var(--color-wa-green)]"
                          }`}
                        >
                          {sv.nombre}
                          <span className="opacity-70"> · {sv.duracion_min} min</span>
                        </button>
                      );
                    })
                  )}
                </div>
                <div>
                  <button onClick={saveServicios} disabled={savingServicios} className={BTN_PRIMARY}>
                    {savingServicios ? "Guardando…" : "Guardar servicios"}
                  </button>
                </div>
              </Acordeon>

              <div className="border-t border-[var(--color-wa-sep)]" />

              {/* Availability */}
              <Acordeon
                titulo="Disponibilidad"
                bajada="Horario base de esta persona. Es la única fuente de verdad de los turnos: lo que se cargue acá es lo que la landing puede ofrecer."
                defaultOpen
              >
                <div className="flex flex-col gap-2">
                  {DAYS.map((d, i) => {
                    const slot = availability.find((s) => s.dia_semana === i);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          onClick={() => toggleDay(i)}
                          className={`w-11 h-[30px] text-xs font-semibold rounded-lg transition-colors ${slot ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}
                        >
                          {d}
                        </button>
                        {slot ? (
                          <>
                            <input
                              type="time"
                              value={slot.hora_inicio}
                              onChange={(e) => updateTime(i, "hora_inicio", e.target.value)}
                              className={campoHora}
                            />
                            <span className="text-sm text-[var(--color-wa-text-sec)]">a</span>
                            <input
                              type="time"
                              value={slot.hora_fin}
                              onChange={(e) => updateTime(i, "hora_fin", e.target.value)}
                              className={campoHora}
                            />
                          </>
                        ) : (
                          <span className="text-sm text-[var(--color-wa-text-sec)]">{DAYS_FULL[i]} — sin atención</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {availError && (
                  <p
                    className="text-sm rounded-lg px-3 py-2 border"
                    style={{ color: "var(--color-wa-error)", borderColor: "var(--color-wa-error)" }}
                  >
                    {availError}
                  </p>
                )}
                <div>
                  <button onClick={saveAvailability} disabled={savingAvail} className={BTN_PRIMARY}>
                    {savingAvail ? "Guardando…" : "Guardar disponibilidad"}
                  </button>
                </div>
              </Acordeon>
            </>
          )}

          {/* Empty state */}
          {!selected && !addingNew && (
            <div className="flex-1 flex items-center justify-center text-[var(--color-wa-text-sec)] text-sm">
              Elegí un profesional para ver o editar sus datos, sus servicios y su horario.
            </div>
          )}
          </div>
        </main>
      </div>


      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar a "${deleteTarget.nombre}" del personal? Si ya tiene citas cargadas se desactiva en lugar de borrarse.`}
          onConfirm={confirmDeleteStaff}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteError(null)}
        >
          <div
            className="bg-[var(--color-wa-panel-l)] rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--color-wa-text-main)] text-sm font-medium mb-5">{deleteError}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setDeleteError(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] hover:bg-[var(--color-wa-green-dark)] transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
