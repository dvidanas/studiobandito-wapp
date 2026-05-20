"use client";
import { useState, useEffect, useCallback } from "react";
import { TopNav, BottomNav } from "@/components/TopNav";

interface Resource {
  id: number;
  name: string;
  phone: string | null;
  active: number;
}

interface AvailabilitySlot {
  id: number;
  resource_id: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
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

  const loadStaff = useCallback(() =>
    fetch("/api/settings/resources").then((r) => r.json()).then(setStaff), []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const loadAvailability = useCallback(async (id: number) => {
    const slots: AvailabilitySlot[] = await fetch(`/api/settings/resources/${id}`).then((r) => r.json());
    setAvailability(slots);
  }, []);

  const selectStaff = (r: Resource) => {
    setSelectedId(r.id);
    setEditName(r.name);
    setEditPhone(r.phone ?? "");
    setAddingNew(false);
    loadAvailability(r.id);
  };

  const createStaff = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/settings/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim() || null }),
    });
    const { id } = await res.json();
    setCreating(false);
    setNewName("");
    setNewPhone("");
    setAddingNew(false);
    await loadStaff();
    const all: Resource[] = await fetch("/api/settings/resources").then((r) => r.json());
    const created = all.find((r) => r.id === id);
    if (created) selectStaff(created);
  };

  const saveInfo = async () => {
    if (!selectedId || !editName.trim()) return;
    setSavingInfo(true);
    await fetch(`/api/settings/resources/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() || null }),
    });
    setSavingInfo(false);
    loadStaff();
  };

  const toggleActive = async (r: Resource) => {
    await fetch(`/api/settings/resources/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: r.active ? 0 : 1 }),
    });
    loadStaff();
    if (selectedId === r.id) {
      setEditName(r.name);
      setEditPhone(r.phone ?? "");
    }
  };

  const deleteStaff = async (r: Resource) => {
    if (!window.confirm(`¿Eliminar a "${r.name}" del personal? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/settings/resources/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "No se pudo eliminar. Puede tener turnos activos.");
      return;
    }
    if (selectedId === r.id) { setSelectedId(null); setAvailability([]); }
    loadStaff();
  };

  const toggleDay = (day: number) => {
    if (!selectedId) return;
    const exists = availability.some((s) => s.day_of_week === day);
    setAvailability((prev) =>
      exists
        ? prev.filter((s) => s.day_of_week !== day)
        : [...prev, { id: 0, resource_id: selectedId, day_of_week: day, time_start: "09:00", time_end: "18:00" }]
    );
  };

  const updateTime = (day: number, field: "time_start" | "time_end", val: string) => {
    setAvailability((prev) => prev.map((s) => s.day_of_week === day ? { ...s, [field]: val } : s));
  };

  const saveAvailability = async () => {
    if (!selectedId) return;
    setSavingAvail(true);
    await fetch(`/api/settings/resources/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: availability.map(({ day_of_week, time_start, time_end }) => ({ day_of_week, time_start, time_end })) }),
    });
    setSavingAvail(false);
  };

  const selected = staff.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <div className="flex-1 flex min-h-0 md:p-3 md:gap-3 overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 flex flex-col bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden border-r md:border border-[var(--color-wa-sep)]" style={{ boxShadow: "var(--shadow-card)" }}>

          <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">Personal</span>
            <button
              onClick={() => { setAddingNew(true); setSelectedId(null); }}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--color-wa-green)] hover:opacity-75 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>
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
                  } ${!r.active ? "opacity-50" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${r.active ? "bg-[var(--color-wa-green)]/15 text-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${r.active ? "text-[var(--color-wa-text-main)]" : "text-[var(--color-wa-text-sec)] line-through"}`}>{r.name}</p>
                    {r.phone && <p className="text-xs text-[var(--color-wa-text-sec)] truncate">{r.phone}</p>}
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.active ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`} />
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right panel */}
        <main
          className={`flex-1 min-w-0 bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-y-auto p-6 md:p-8 flex flex-col gap-6 ${(!selected && !addingNew) ? "hidden md:flex" : "flex"}`}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* New staff form */}
          {addingNew && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Nuevo integrante</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre *</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createStaff()} className={INPUT} placeholder="Ej: Martín" />
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
              {/* Info */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Datos del integrante</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(selected)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${selected.active ? "border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:border-amber-400 hover:text-amber-500" : "border-[var(--color-wa-green)]/40 text-[var(--color-wa-green)] hover:bg-[var(--color-wa-green)]/10"}`}
                    >
                      {selected.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => deleteStaff(selected)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
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
              </div>

              <div className="border-t border-[var(--color-wa-sep)]" />

              {/* Availability */}
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Disponibilidad</h2>
                <div className="flex flex-col gap-2">
                  {DAYS.map((d, i) => {
                    const slot = availability.find((s) => s.day_of_week === i);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          onClick={() => toggleDay(i)}
                          className={`w-11 text-xs font-semibold py-1.5 rounded-lg transition-colors ${slot ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}
                        >
                          {d}
                        </button>
                        {slot ? (
                          <>
                            <input
                              type="time"
                              value={slot.time_start}
                              onChange={(e) => updateTime(i, "time_start", e.target.value)}
                              className="bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors"
                            />
                            <span className="text-sm text-[var(--color-wa-text-sec)]">a</span>
                            <input
                              type="time"
                              value={slot.time_end}
                              onChange={(e) => updateTime(i, "time_end", e.target.value)}
                              className="bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors"
                            />
                          </>
                        ) : (
                          <span className="text-sm text-[var(--color-wa-text-sec)]">{DAYS_FULL[i]} — sin atención</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div>
                  <button onClick={saveAvailability} disabled={savingAvail} className={BTN_PRIMARY}>
                    {savingAvail ? "Guardando…" : "Guardar disponibilidad"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!selected && !addingNew && (
            <div className="flex-1 flex items-center justify-center text-[var(--color-wa-text-sec)] text-sm">
              Seleccioná un integrante del personal para ver o editar sus datos.
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
