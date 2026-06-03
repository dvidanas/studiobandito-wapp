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

type Section = "negocio" | "servicios" | "promociones" | "horarios" | "cerrados" | "personal" | "backup";

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
  {
    id: "personal",
    label: "Personal",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "backup",
    label: "Backup",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
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

// ── Section: Personal ────────────────────────────────────────────────────────
interface Resource {
  id: number;
  name: string;
  phone: string | null;
  active: number;
}
interface AvailSlot {
  id: number;
  resource_id: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
}
const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEK_DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function SectionPersonal() {
  const [staff, setStaff] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [availability, setAvailability] = useState<AvailSlot[]>([]);
  const [savingAvail, setSavingAvail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadStaff = useCallback(() =>
    fetch("/api/settings/resources").then((r) => r.json()).then(setStaff), []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const loadAvailability = useCallback(async (id: number) => {
    const slots: AvailSlot[] = await fetch(`/api/settings/resources/${id}`).then((r) => r.json());
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
    setNewName(""); setNewPhone(""); setAddingNew(false);
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
  };

  const confirmDeleteStaff = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/settings/resources/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "No se pudo eliminar. Puede tener turnos activos.");
      setDeleteTarget(null);
      return;
    }
    if (selectedId === deleteTarget.id) { setSelectedId(null); setAvailability([]); }
    setDeleteTarget(null);
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

  const updateAvailTime = (day: number, field: "time_start" | "time_end", val: string) => {
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
    <div className="flex gap-4 h-full min-h-[400px]">
      {/* Staff list */}
      <Card title="Integrantes">
        <div className="flex flex-col gap-2 min-w-[180px]">
          {staff.length === 0 && !addingNew && (
            <p className="text-sm text-[var(--color-wa-text-sec)] py-1">Sin personal aún.</p>
          )}
          {staff.map((r) => (
            <button
              key={r.id}
              onClick={() => selectStaff(r)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors w-full ${selectedId === r.id ? "bg-[var(--color-wa-green)]/10 text-[var(--color-wa-text-main)]" : "hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]"} ${!r.active ? "opacity-50" : ""}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.active ? "bg-[var(--color-wa-green)]/15 text-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}>
                {r.name.charAt(0).toUpperCase()}
              </div>
              <span className={`text-sm font-medium truncate ${!r.active ? "line-through" : ""}`}>{r.name}</span>
            </button>
          ))}
          {addingNew && (
            <div className="flex flex-col gap-2 mt-1 p-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-green)]/40">
              <input className={INPUT} placeholder="Nombre *" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createStaff()} />
              <input className={INPUT} placeholder="Teléfono" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <div className="flex gap-2">
                <button className={BTN_PRIMARY} onClick={createStaff} disabled={creating || !newName.trim()}>{creating ? "…" : "Crear"}</button>
                <button className={BTN_GHOST} onClick={() => setAddingNew(false)}>Cancelar</button>
              </div>
            </div>
          )}
          {!addingNew && (
            <button onClick={() => { setAddingNew(true); setSelectedId(null); }} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[var(--color-wa-sep)] text-sm text-[var(--color-wa-text-sec)] hover:border-[var(--color-wa-green)] hover:text-[var(--color-wa-green)] transition-colors mt-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Agregar
            </button>
          )}
        </div>
      </Card>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 flex flex-col gap-4">
          <Card title="Datos del integrante">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[var(--color-wa-text-main)]">{selected.name}</span>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(selected)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${selected.active ? "border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:border-amber-400 hover:text-amber-500" : "border-[var(--color-wa-green)]/40 text-[var(--color-wa-green)] hover:bg-[var(--color-wa-green)]/10"}`}>
                  {selected.active ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => setDeleteTarget(selected)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre *</label>
                <input className={INPUT} value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
                <input className={INPUT} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="2646123456" />
              </div>
            </div>
            <button onClick={saveInfo} disabled={savingInfo || !editName.trim()} className={BTN_PRIMARY}>{savingInfo ? "Guardando…" : "Guardar datos"}</button>
          </Card>

          <Card title="Disponibilidad semanal">
            <div className="flex flex-col gap-2 mb-4">
              {WEEK_DAYS.map((d, i) => {
                const slot = availability.find((s) => s.day_of_week === i);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <button onClick={() => toggleDay(i)} className={`w-11 text-xs font-semibold py-1.5 rounded-lg transition-colors ${slot ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}>{d}</button>
                    {slot ? (
                      <>
                        <input type="time" value={slot.time_start} onChange={(e) => updateAvailTime(i, "time_start", e.target.value)} className="bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors" />
                        <span className="text-sm text-[var(--color-wa-text-sec)]">a</span>
                        <input type="time" value={slot.time_end} onChange={(e) => updateAvailTime(i, "time_end", e.target.value)} className="bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors" />
                      </>
                    ) : (
                      <span className="text-sm text-[var(--color-wa-text-sec)]">{WEEK_DAYS_FULL[i]} — sin atención</span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={saveAvailability} disabled={savingAvail} className={BTN_PRIMARY}>{savingAvail ? "Guardando…" : "Guardar disponibilidad"}</button>
          </Card>
        </div>
      )}

      {!selected && !addingNew && (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-wa-text-sec)]">
          Seleccioná un integrante para ver sus datos.
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar a "${deleteTarget.name}" del personal? Esta acción no se puede deshacer.`}
          onConfirm={confirmDeleteStaff}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteError(null)}>
          <div className="bg-[var(--color-wa-panel-l)] rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-[var(--color-wa-text-main)] text-sm font-medium mb-5">{deleteError}</p>
            <div className="flex justify-end">
              <button onClick={() => setDeleteError(null)} className={BTN_PRIMARY}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Backup ──────────────────────────────────────────────────────────
interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}
interface BackupStatus {
  backups: BackupInfo[];
  driveConfigured: boolean;
  lastBackup: BackupInfo | null;
}

function SectionBackup() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/backup").then((r) => r.json()).then(setStatus);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runBackup = async () => {
    setRunning(true);
    setResult(null);
    const r = await fetch("/api/backup", { method: "POST" });
    const data = await r.json();
    setResult(data);
    setRunning(false);
    load();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Backup de datos">
        <p className="text-xs text-[var(--color-wa-text-sec)] mb-5">
          El sistema realiza backups automáticos cada 24 h. Podés forzar uno manual en cualquier momento. Los backups incluyen todos los datos: turnos, mensajes, contactos, configuraciones.
        </p>

        {/* Status row */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-1">Último backup</p>
            {status?.lastBackup ? (
              <>
                <p className="text-sm font-medium text-[var(--color-wa-text-main)]">{formatDate(status.lastBackup.createdAt)}</p>
                <p className="text-xs text-[var(--color-wa-text-sec)]">{formatSize(status.lastBackup.size)}</p>
              </>
            ) : (
              <p className="text-sm text-[var(--color-wa-text-sec)]">Sin backups aún</p>
            )}
          </div>
          <div className="flex-1 min-w-[120px] px-4 py-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-1">Backups locales</p>
            <p className="text-sm font-medium text-[var(--color-wa-text-main)]">{status?.backups.length ?? "—"}</p>
            <p className="text-xs text-[var(--color-wa-text-sec)]">máx. 30 archivos</p>
          </div>
          <div className="flex-1 min-w-[120px] px-4 py-3 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-1">Google Drive</p>
            <div className={`flex items-center gap-1.5 mt-1`}>
              <div className={`w-2 h-2 rounded-full ${status?.driveConfigured ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`} />
              <span className="text-sm font-medium text-[var(--color-wa-text-main)]">{status?.driveConfigured ? "Configurado" : "No configurado"}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={runBackup} disabled={running} className={BTN_PRIMARY + " flex items-center gap-2"}>
            {running ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Haciendo backup…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Hacer backup ahora
              </>
            )}
          </button>
          {result && (
            <span className={`text-sm font-medium ${result.ok ? "text-[var(--color-wa-green)]" : "text-red-500"}`}>
              {result.ok ? "✓ Backup completado" : `Error: ${result.error ?? "desconocido"}`}
            </span>
          )}
        </div>
      </Card>

      {/* Backup list */}
      {status && status.backups.length > 0 && (
        <Card title="Historial de backups">
          <div className="flex flex-col gap-1.5">
            {status.backups.slice(0, 10).map((b) => (
              <div key={b.name} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)]">
                <svg className="w-4 h-4 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-wa-text-main)] truncate">{b.name}</p>
                  <p className="text-xs text-[var(--color-wa-text-sec)]">{formatDate(b.createdAt)} · {formatSize(b.size)}</p>
                </div>
                <a
                  href={`/api/backup?file=${encodeURIComponent(b.name)}`}
                  download
                  className="p-1.5 rounded-lg text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)] transition-colors"
                  title="Descargar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            ))}
            {status.backups.length > 10 && (
              <p className="text-xs text-[var(--color-wa-text-sec)] px-2 pt-1">y {status.backups.length - 10} más…</p>
            )}
          </div>
        </Card>
      )}
    </div>
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
      case "personal":    return <SectionPersonal />;
      case "backup":      return <SectionBackup />;
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
