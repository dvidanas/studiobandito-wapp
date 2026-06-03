"use client";
import { useState, useEffect, useCallback } from "react";
import { TopNav, BottomNav } from "@/components/TopNav";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Style constants ──────────────────────────────────────────────────────────
const INPUT =
  "w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors";
const BTN_PRIMARY =
  "px-5 py-2.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all duration-150";
const BTN_GHOST =
  "px-4 py-2 text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] transition-colors";
const BTN_DANGER =
  "p-1.5 rounded-lg text-[var(--color-wa-text-sec)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors";

// ── Types ────────────────────────────────────────────────────────────────────
interface BusinessInfo {
  business_name: string;
  business_description: string;
  address: string;
  phone: string;
  hours: Record<string, { open: string; close: string } | null>;
}
interface Service {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number;
  active: number;
}
interface Promotion {
  id: number;
  title: string;
  description: string | null;
  discount: string | null;
  active: number;
}

type Section = "negocio" | "servicios" | "promociones" | "horarios" | "cerrados";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "negocio",
    label: "Negocio",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "servicios",
    label: "Servicios",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: "promociones",
    label: "Promociones",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: "horarios",
    label: "Horarios",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "cerrados",
    label: "Días cerrados",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
];

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAYS_ES: Record<string, string> = {
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
  thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
};

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
      {msg}
    </div>
  );
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-wa-sep)]">
        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Section: Negocio ─────────────────────────────────────────────────────────
function SectionNegocio({ onSaved }: { onSaved: () => void }) {
  const [data, setData] = useState<Omit<BusinessInfo, "hours">>({
    business_name: "", business_description: "", address: "", phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/business")
      .then((r) => r.json())
      .then((d) => { setData({ business_name: d.business_name, business_description: d.business_description, address: d.address, phone: d.phone }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setSaving(false);
    onSaved();
  };

  if (loading) return <div className="h-40 animate-pulse bg-[var(--color-wa-hover)] rounded-2xl" />;

  return (
    <Card title="Datos del negocio">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1.5">Nombre del negocio</label>
          <input className={INPUT} value={data.business_name} onChange={(e) => setData((p) => ({ ...p, business_name: e.target.value }))} placeholder="Studio Bandito" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1.5">Teléfono</label>
          <input className={INPUT} value={data.phone} onChange={(e) => setData((p) => ({ ...p, phone: e.target.value }))} placeholder="2646230305" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1.5">Descripción</label>
          <textarea className={INPUT + " resize-none"} rows={2} value={data.business_description} onChange={(e) => setData((p) => ({ ...p, business_description: e.target.value }))} placeholder="Estudio de corte de cabello, barba y masajes…" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1.5">Dirección</label>
          <input className={INPUT} value={data.address} onChange={(e) => setData((p) => ({ ...p, address: e.target.value }))} placeholder="Tucumán 1106 sur, Capital, San Juan" />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button className={BTN_PRIMARY} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </Card>
  );
}

// ── Section: Servicios ───────────────────────────────────────────────────────
const EMPTY_SVC = { name: "", description: "", price: "", duration_minutes: 40 };

function SectionServicios({ onSaved }: { onSaved: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_SVC);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const load = useCallback(() => {
    fetch("/api/settings/services").then((r) => r.json()).then((d) => { setServices(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (svc: Service) => {
    setForm({ name: svc.name, description: svc.description ?? "", price: svc.price ?? "", duration_minutes: svc.duration_minutes });
    setEditing(svc.id);
  };

  const startNew = () => { setForm(EMPTY_SVC); setEditing("new"); };
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing === "new") {
      await fetch("/api/settings/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch(`/api/settings/services/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setEditing(null);
    load();
    onSaved();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/settings/services/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  if (loading) return <div className="h-40 animate-pulse bg-[var(--color-wa-hover)] rounded-2xl" />;

  return (
    <Card title="Servicios">
      <div className="flex flex-col gap-2">
        {services.map((svc) =>
          editing === svc.id ? (
            <ServiceForm key={svc.id} form={form} setForm={setForm} saving={saving} onSave={save} onCancel={cancel} />
          ) : (
            <div key={svc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-wa-text-main)] truncate">{svc.name}</p>
                <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">
                  {svc.price ? `$${Number(svc.price).toLocaleString("es-AR")}` : "Sin precio"} · {svc.duration_minutes} min
                  {svc.description ? ` · ${svc.description}` : ""}
                </p>
              </div>
              <button onClick={() => startEdit(svc)} className="p-1.5 rounded-lg text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => setDeleteTarget(svc)} className={BTN_DANGER}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          )
        )}
        {editing === "new" && (
          <ServiceForm form={form} setForm={setForm} saving={saving} onSave={save} onCancel={cancel} />
        )}
        {editing === null && (
          <button onClick={startNew} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[var(--color-wa-sep)] text-sm text-[var(--color-wa-text-sec)] hover:border-[var(--color-wa-green)] hover:text-[var(--color-wa-green)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Agregar servicio
          </button>
        )}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar "${deleteTarget.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Card>
  );
}

function ServiceForm({ form, setForm, saving, onSave, onCancel }: {
  form: typeof EMPTY_SVC;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_SVC>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-green)]/40">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre *</label>
          <input className={INPUT} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Corte de cabello" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Precio ($)</label>
          <input className={INPUT} type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="17000" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Duración (min)</label>
          <input className={INPUT} type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} placeholder="40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Descripción</label>
          <input className={INPUT} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Incluye productos" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className={BTN_GHOST} onClick={onCancel}>Cancelar</button>
        <button className={BTN_PRIMARY} onClick={onSave} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </div>
  );
}

// ── Section: Promociones ─────────────────────────────────────────────────────
const EMPTY_PROMO = { title: "", description: "", discount: "" };

function SectionPromociones({ onSaved }: { onSaved: () => void }) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const load = useCallback(() => {
    fetch("/api/promotions").then((r) => r.json()).then((d) => { setPromos(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (p: Promotion) => {
    setForm({ title: p.title, description: p.description ?? "", discount: p.discount ?? "" });
    setEditing(p.id);
  };
  const startNew = () => { setForm(EMPTY_PROMO); setEditing("new"); };
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing === "new") {
      await fetch("/api/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch(`/api/promotions/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setEditing(null);
    load();
    onSaved();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/promotions/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  if (loading) return <div className="h-32 animate-pulse bg-[var(--color-wa-hover)] rounded-2xl" />;

  return (
    <Card title="Promociones">
      <div className="flex flex-col gap-2">
        {promos.length === 0 && editing === null && (
          <p className="text-sm text-[var(--color-wa-text-sec)] py-2">No hay promociones activas.</p>
        )}
        {promos.map((promo) =>
          editing === promo.id ? (
            <PromoForm key={promo.id} form={form} setForm={setForm} saving={saving} onSave={save} onCancel={cancel} />
          ) : (
            <div key={promo.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-wa-text-main)] truncate">{promo.title}</p>
                <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">
                  {promo.discount ? promo.discount : ""}
                  {promo.discount && promo.description ? " · " : ""}
                  {promo.description ?? ""}
                </p>
              </div>
              <button onClick={() => startEdit(promo)} className="p-1.5 rounded-lg text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => setDeleteTarget(promo)} className={BTN_DANGER}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          )
        )}
        {editing === "new" && (
          <PromoForm form={form} setForm={setForm} saving={saving} onSave={save} onCancel={cancel} />
        )}
        {editing === null && (
          <button onClick={startNew} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[var(--color-wa-sep)] text-sm text-[var(--color-wa-text-sec)] hover:border-[var(--color-wa-green)] hover:text-[var(--color-wa-green)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Agregar promoción
          </button>
        )}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar "${deleteTarget.title}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Card>
  );
}

function PromoForm({ form, setForm, saving, onSave, onCancel }: {
  form: typeof EMPTY_PROMO;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_PROMO>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-green)]/40">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Título *</label>
          <input className={INPUT} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Promo de invierno" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Descuento</label>
          <input className={INPUT} value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} placeholder="20% off" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Descripción</label>
          <input className={INPUT} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Válido lunes y martes" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className={BTN_GHOST} onClick={onCancel}>Cancelar</button>
        <button className={BTN_PRIMARY} onClick={onSave} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </div>
  );
}

// ── Section: Horarios ────────────────────────────────────────────────────────
function SectionHorarios({ onSaved }: { onSaved: () => void }) {
  const [hours, setHours] = useState<Record<string, { open: string; close: string } | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/business")
      .then((r) => r.json())
      .then((d) => { setHours(d.hours ?? {}); setLoading(false); });
  }, []);

  const toggle = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { open: "10:00", close: "20:00" },
    }));
  };

  const updateTime = (day: string, field: "open" | "close", val: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] as { open: string; close: string }), [field]: val },
    }));
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    setSaving(false);
    onSaved();
  };

  if (loading) return <div className="h-60 animate-pulse bg-[var(--color-wa-hover)] rounded-2xl" />;

  return (
    <Card title="Horarios de atención">
      <div className="flex flex-col gap-2">
        {DAYS_ORDER.map((day) => {
          const slot = hours[day];
          const isOpen = slot !== null && slot !== undefined;
          return (
            <div key={day} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isOpen ? "bg-[var(--color-wa-bg-main)] border-[var(--color-wa-sep)]" : "bg-transparent border-[var(--color-wa-sep)]/40"}`}>
              <button
                onClick={() => toggle(day)}
                className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${isOpen ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`}
                style={{ height: "22px", width: "40px" }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${isOpen ? "translate-x-[18px]" : ""}`}
                  style={{ width: "18px", height: "18px" }}
                />
              </button>
              <span className={`w-24 text-sm font-medium flex-shrink-0 ${isOpen ? "text-[var(--color-wa-text-main)]" : "text-[var(--color-wa-text-sec)]"}`}>
                {DAYS_ES[day]}
              </span>
              {isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    className={INPUT + " w-32"}
                    value={(slot as { open: string; close: string }).open}
                    onChange={(e) => updateTime(day, "open", e.target.value)}
                  />
                  <span className="text-[var(--color-wa-text-sec)] text-sm">a</span>
                  <input
                    type="time"
                    className={INPUT + " w-32"}
                    value={(slot as { open: string; close: string }).close}
                    onChange={(e) => updateTime(day, "close", e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-xs text-[var(--color-wa-text-sec)]">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <button className={BTN_PRIMARY} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </Card>
  );
}

// ── Section: Días cerrados ───────────────────────────────────────────────────
function SectionCerrados({ onSaved }: { onSaved: () => void }) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/settings/closed-dates").then((r) => r.json()).then((d) => { setDates(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDate = async () => {
    if (!newDate) return;
    setAdding(true);
    await fetch("/api/settings/closed-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate }),
    });
    setNewDate("");
    setAdding(false);
    load();
    onSaved();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/settings/closed-dates/${deleteTarget}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) return <div className="h-32 animate-pulse bg-[var(--color-wa-hover)] rounded-2xl" />;

  return (
    <Card title="Días cerrados">
      <p className="text-xs text-[var(--color-wa-text-sec)] mb-4">Fechas especiales en las que el negocio no atiende (feriados, vacaciones, etc.).</p>
      <div className="flex gap-2 mb-4">
        <input
          type="date"
          className={INPUT}
          value={newDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setNewDate(e.target.value)}
        />
        <button className={BTN_PRIMARY + " whitespace-nowrap"} onClick={addDate} disabled={adding || !newDate}>
          {adding ? "…" : "Agregar"}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {dates.length === 0 && (
          <p className="text-sm text-[var(--color-wa-text-sec)] py-2">No hay días cerrados registrados.</p>
        )}
        {dates.map((date) => (
          <div key={date} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-wa-text-main)] capitalize">{formatDate(date)}</p>
            </div>
            <button onClick={() => setDeleteTarget(date)} className={BTN_DANGER}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar el día cerrado ${formatDate(deleteTarget)}?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ConfigPage() {
  const [active, setActive] = useState<Section>("negocio");
  const [toast, setToast] = useState("");

  const showToast = useCallback(() => setToast("¡Guardado!"), []);
  const clearToast = useCallback(() => setToast(""), []);

  const renderSection = () => {
    switch (active) {
      case "negocio":     return <SectionNegocio onSaved={showToast} />;
      case "servicios":   return <SectionServicios onSaved={showToast} />;
      case "promociones": return <SectionPromociones onSaved={showToast} />;
      case "horarios":    return <SectionHorarios onSaved={showToast} />;
      case "cerrados":    return <SectionCerrados onSaved={showToast} />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop */}
        <aside className="w-56 flex-shrink-0 border-r border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] overflow-y-auto hidden md:flex flex-col py-4 px-3 gap-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)] px-3 mb-2">Configuración</p>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-colors w-full ${
                active === s.id
                  ? "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-main)] font-semibold"
                  : "text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)]"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Mobile section pills */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active === s.id
                    ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                    : "bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {renderSection()}
        </main>
      </div>

      <BottomNav />

      {toast && <Toast msg={toast} onDone={clearToast} />}
    </div>
  );
}
