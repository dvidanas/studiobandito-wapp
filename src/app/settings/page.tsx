"use client";
import { useState, useEffect, useCallback } from "react";
import { TopNav } from "@/components/TopNav";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  business_name: string;
  business_description: string;
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number;
  active: number;
}

interface Resource {
  id: number;
  name: string;
  active: number;
}

interface AvailabilitySlot {
  id: number;
  resource_id: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
}

type Tab = "apariencia" | "negocio" | "servicios" | "empleados";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="px-5 py-3.5 border-b border-[var(--color-wa-sep)]">
        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-5 py-2.5 bg-[var(--color-wa-green)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all duration-150 shadow-sm"
    >
      {loading ? "Guardando…" : "Guardar"}
    </button>
  );
}

// ── Tab: Apariencia ────────────────────────────────────────────────────────────

function TabApariencia() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Section title="Tema de la interfaz">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-medium text-[var(--color-wa-text-main)]">
            {isDark ? "Modo oscuro" : "Modo claro"}
          </p>
          <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">
            Cambia la apariencia de toda la aplicación
          </p>
        </div>
        <button
          onClick={toggle}
          className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: isDark ? "var(--color-wa-green)" : "var(--color-wa-sep)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: isDark ? "translateX(24px)" : "translateX(0)" }}
          />
        </button>
      </div>
    </Section>
  );
}

// ── Tab: Negocio ──────────────────────────────────────────────────────────────

function TabNegocio() {
  const [info, setInfo] = useState<BusinessInfo>({ business_name: "", business_description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/business")
      .then((r) => r.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Datos del negocio">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre del negocio</label>
            <input
              value={info.business_name}
              onChange={(e) => setInfo((p) => ({ ...p, business_name: e.target.value }))}
              className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors"
              placeholder="Nombre de tu negocio"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Descripción</label>
            <textarea
              value={info.business_description}
              onChange={(e) => setInfo((p) => ({ ...p, business_description: e.target.value }))}
              rows={4}
              className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors resize-none"
              placeholder="Descripción breve del negocio"
            />
          </div>
          <div className="flex items-center gap-3">
            <SaveButton loading={saving} onClick={save} />
            {saved && <span className="text-sm text-[var(--color-wa-green)]">Guardado</span>}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Tab: Servicios ────────────────────────────────────────────────────────────

const EMPTY_SERVICE = { name: "", description: "", price: "", duration_minutes: 30 };

function TabServicios() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/settings/services")
      .then((r) => r.json())
      .then(setServices)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId !== null) {
      await fetch(`/api/settings/services/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/settings/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setForm(EMPTY_SERVICE);
    setEditId(null);
    load();
  };

  const toggleActive = async (s: Service) => {
    await fetch(`/api/settings/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: s.active ? 0 : 1 }),
    });
    load();
  };

  const remove = async (id: number) => {
    await fetch(`/api/settings/services/${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (s: Service) => {
    setEditId(s.id);
    setForm({ name: s.name, description: s.description ?? "", price: s.price ?? "", duration_minutes: s.duration_minutes });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_SERVICE); };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Form */}
      <Section title={editId !== null ? "Editar servicio" : "Nuevo servicio"}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors"
                placeholder="Ej: Consulta inicial"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Precio</label>
              <input
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors"
                placeholder="Ej: $5.000 o Consultar"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Descripción</label>
              <input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors"
                placeholder="Descripción breve"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Duración (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={form.duration_minutes}
                onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveButton loading={saving} onClick={save} />
            {editId !== null && (
              <button onClick={cancelEdit} className="px-4 py-2 text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* List */}
      {services.length > 0 && (
        <Section title={`Servicios (${services.length})`}>
          <ul className="flex flex-col gap-2">
            {services.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s.active ? "border-[var(--color-wa-sep)]" : "border-dashed border-[var(--color-wa-sep)] opacity-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-[var(--color-wa-text-main)] truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.price && <span className="text-sm text-[var(--color-wa-green)] font-medium">{s.price}</span>}
                    {s.description && <span className="text-sm text-[var(--color-wa-text-sec)] truncate">{s.description}</span>}
                    <span className="text-xs text-[var(--color-wa-text-sec)]">{s.duration_minutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(s)}
                    className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleActive(s)}
                    className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"
                    title={s.active ? "Desactivar" : "Activar"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {s.active
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      }
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-red-500"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Empleados ────────────────────────────────────────────────────────────

function TabEmpleados() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Record<number, AvailabilitySlot[]>>({});

  const load = useCallback(() => {
    fetch("/api/settings/resources")
      .then((r) => r.json())
      .then(setResources)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAvailability = async (id: number) => {
    if (availability[id]) return;
    const slots: AvailabilitySlot[] = await fetch(`/api/settings/resources/${id}`).then((r) => r.json());
    setAvailability((p) => ({ ...p, [id]: slots }));
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadAvailability(id);
  };

  const create = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch("/api/settings/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setSaving(false);
    load();
  };

  const toggleActive = async (r: Resource) => {
    await fetch(`/api/settings/resources/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: r.active ? 0 : 1 }),
    });
    load();
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/settings/resources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar el recurso.");
      return;
    }
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const toggleDay = async (resourceId: number, day: number) => {
    const current = availability[resourceId] ?? [];
    const exists = current.some((s) => s.day_of_week === day);
    let next: AvailabilitySlot[];
    if (exists) {
      next = current.filter((s) => s.day_of_week !== day);
    } else {
      next = [...current, { id: 0, resource_id: resourceId, day_of_week: day, time_start: "09:00", time_end: "18:00" }];
    }
    setAvailability((p) => ({ ...p, [resourceId]: next }));
    await fetch(`/api/settings/resources/${resourceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: next.map(({ day_of_week, time_start, time_end }) => ({ day_of_week, time_start, time_end })) }),
    });
  };

  const updateTime = (resourceId: number, day: number, field: "time_start" | "time_end", val: string) => {
    setAvailability((p) => ({
      ...p,
      [resourceId]: (p[resourceId] ?? []).map((s) => s.day_of_week === day ? { ...s, [field]: val } : s),
    }));
  };

  const saveAvailability = async (resourceId: number) => {
    const slots = availability[resourceId] ?? [];
    await fetch(`/api/settings/resources/${resourceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: slots.map(({ day_of_week, time_start, time_end }) => ({ day_of_week, time_start, time_end })) }),
    });
  };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Nuevo empleado / recurso">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            className="flex-1 bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors"
            placeholder="Nombre del empleado o recurso"
          />
          <SaveButton loading={saving} onClick={create} />
        </div>
      </Section>

      {resources.length > 0 && (
        <Section title={`Empleados / Recursos (${resources.length})`}>
          <ul className="flex flex-col gap-2">
            {resources.map((r) => (
              <li key={r.id} className="border border-[var(--color-wa-sep)] rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.active ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-text-sec)]"}`} />
                  <span className={`flex-1 text-base font-medium ${r.active ? "text-[var(--color-wa-text-main)]" : "text-[var(--color-wa-text-sec)] line-through"}`}>
                    {r.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleExpand(r.id)}
                      className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"
                      title="Horarios"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleActive(r)}
                      className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"
                      title={r.active ? "Desactivar" : "Activar"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {r.active
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        }
                      </svg>
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-red-500"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Horarios expandidos */}
                {expandedId === r.id && (
                  <div className="border-t border-[var(--color-wa-sep)] px-3 py-3 bg-[var(--color-wa-bg-main)]">
                    <p className="text-sm font-medium text-[var(--color-wa-text-main)] mb-3">Días y horarios de atención</p>
                    <div className="flex flex-col gap-2">
                      {DAYS.map((d, i) => {
                        const slot = (availability[r.id] ?? []).find((s) => s.day_of_week === i);
                        const active = !!slot;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <button
                              onClick={() => toggleDay(r.id, i)}
                              className={`w-10 text-xs font-semibold py-1 rounded ${active ? "bg-[var(--color-wa-green)] text-white" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}
                            >
                              {d}
                            </button>
                            {active && (
                              <>
                                <input
                                  type="time"
                                  value={slot.time_start}
                                  onChange={(e) => updateTime(r.id, i, "time_start", e.target.value)}
                                  className="bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors"
                                />
                                <span className="text-sm text-[var(--color-wa-text-sec)]">a</span>
                                <input
                                  type="time"
                                  value={slot.time_end}
                                  onChange={(e) => updateTime(r.id, i, "time_end", e.target.value)}
                                  className="bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors"
                                />
                              </>
                            )}
                            {!active && (
                              <span className="text-sm text-[var(--color-wa-text-sec)]">{DAYS_FULL[i]} — sin atención</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => saveAvailability(r.id)}
                      className="mt-3 px-5 py-2.5 bg-[var(--color-wa-green)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 transition-all duration-150 shadow-sm"
                    >
                      Guardar horarios
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "apariencia",
    label: "Apariencia",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    key: "negocio",
    label: "Negocio",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: "servicios",
    label: "Servicios",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: "empleados",
    label: "Empleados",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("apariencia");

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0">
          <h1 className="text-lg font-bold text-[var(--color-wa-text-main)]">Configuración</h1>
          <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">Personalizá la aplicación y el negocio</p>
        </div>

        <div className="flex flex-1 min-h-0 md:px-3 md:pb-3 md:gap-3">
          {/* Sidebar de tabs — visible en md+ */}
          <nav className="hidden md:flex flex-col w-48 lg:w-56 bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] py-3 gap-0.5 px-2 flex-shrink-0 overflow-y-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                  tab === t.key
                    ? "bg-[var(--color-wa-green)]/10 text-[var(--color-wa-green)] font-semibold"
                    : "text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tabs móvil — barra horizontal */}
          <div className="flex flex-col flex-1 min-w-0 md:bg-white md:dark:bg-[var(--color-wa-panel-l)] md:rounded-2xl md:shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:overflow-hidden">
            <div className="md:hidden flex border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] flex-shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-150 border-b-2 ${
                    tab === t.key
                      ? "border-[var(--color-wa-green)] text-[var(--color-wa-green)]"
                      : "border-transparent text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-2xl mx-auto">
                <div key={tab} className="animate-in flex flex-col gap-4">
                  {tab === "apariencia" && <TabApariencia />}
                  {tab === "negocio" && <TabNegocio />}
                  {tab === "servicios" && <TabServicios />}
                  {tab === "empleados" && <TabEmpleados />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
