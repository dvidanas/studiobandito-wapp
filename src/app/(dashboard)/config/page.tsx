"use client";
import Link from "next/link";
import { plata } from "@/lib/format";
import { useState, useEffect, useCallback } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HorariosPanel } from "@/components/panel/HorariosPanel";

// ── Style constants ──────────────────────────────────────────────────────────
const INPUT =
  "w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors";
/** Entrada del menú de Config. La usan el botón de sección y el link a /staff:
    tienen que verse igual, porque para el que mira son la misma lista. */
const claseNav = (activa: boolean) =>
  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-colors w-full ${
    activa
      ? "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-main)] font-semibold"
      : "text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)]"
  }`;

const clasePastilla = (activa: boolean) =>
  `flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
    activa
      ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
      : "bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"
  }`;

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
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number;
  activo: number;
}
interface Promotion {
  id: number;
  title: string;
  description: string | null;
  discount: string | null;
  active: number;
}

type Section = "negocio" | "servicios" | "promociones" | "horarios" | "backup";

/**
 * Una entrada del menú de Config es una de dos cosas: una sección que se pinta
 * en el panel derecho (`id`), o un link a una pantalla propia (`href`).
 *
 * Personal es lo segundo. Antes era una sección con una descripción y un botón
 * "Abrir Personal", así que llegar a la lista de profesionales costaba dos
 * clicks para ver una pantalla que no decía nada que no se supiera.
 */
interface EntradaNav {
  label: string;
  icon: React.ReactNode;
  id?: Section;
  href?: string;
}

const SECTIONS: EntradaNav[] = [
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
    href: "/staff",
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

const DAYS_ORDER = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DAYS_ES: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
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
    <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
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
const EMPTY_SVC = { nombre: "", descripcion: "", precio: "", duracion_min: 30 };

function SectionServicios({ onSaved }: { onSaved: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_SVC);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/settings/servicios?todos=1").then((r) => r.json()).then((d) => { setServices(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (svc: Service) => {
    setForm({
      nombre: svc.nombre,
      descripcion: svc.descripcion ?? "",
      precio: String(svc.precio),
      duracion_min: svc.duracion_min,
    });
    setEditing(svc.id);
  };

  const startNew = () => { setForm(EMPTY_SVC); setEditing("new"); };
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    setError("");
    const cuerpo = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio: Number(form.precio) || 0,
      duracion_min: Number(form.duracion_min),
    };
    const res =
      editing === "new"
        ? await fetch("/api/settings/servicios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) })
        : await fetch(`/api/settings/servicios/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo guardar el servicio.");
      return;
    }
    setEditing(null);
    load();
    onSaved();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/settings/servicios/${deleteTarget.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    // Con citas asociadas el backend desactiva en vez de borrar: borrarlo
    // dejaría esas citas sin servicio y rompería el histórico de caja.
    if (d.aviso) setError(d.aviso);
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
                <p className={`text-sm font-medium truncate ${svc.activo ? "text-[var(--color-wa-text-main)]" : "text-[var(--color-wa-text-sec)] line-through"}`}>
                  {svc.nombre}
                </p>
                <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">
                  {plata(svc.precio)} · {svc.duracion_min} min
                  {svc.descripcion ? ` · ${svc.descripcion}` : ""}
                  {svc.activo ? "" : " · inactivo"}
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
      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-wa-error)" }}>{error}</p>
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar "${deleteTarget.nombre}"? Si ya tiene citas asociadas se desactiva en lugar de borrarse.`}
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
          <input className={INPUT} value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Corte clásico" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Precio ($)</label>
          <input className={INPUT} type="number" value={form.precio} onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))} placeholder="6000" />
        </div>
        <div>
          {/* La duración define la grilla de turnos de este servicio, no es
              informativa: un color de 90 min genera slots de 90 min. */}
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Duración (min) *</label>
          <input className={INPUT} type="number" value={form.duracion_min} onChange={(e) => setForm((p) => ({ ...p, duracion_min: Number(e.target.value) }))} placeholder="30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Descripción</label>
          <input className={INPUT} value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Incluye productos" />
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
      // Horario del negocio, disponibilidad de cada uno y días cerrados en una
      // sola pantalla: son la misma decisión operativa. Antes eran tres
      // secciones y "cerrar mañana por feriado" obligaba a recorrerlas.
      case "horarios":    return <HorariosPanel onSaved={showToast} />;
      case "backup":      return <SectionBackup />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      <div className="flex flex-1 overflow-hidden md:p-3 md:gap-3">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-[350px] flex-shrink-0 bg-[var(--color-wa-panel-l)] flex-col rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden py-4 px-3 gap-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)] px-3 mb-2">Configuración</p>
          {SECTIONS.map((s) =>
            s.href ? (
              <Link key={s.href} href={s.href} className={claseNav(false)}>
                {s.icon}
                {s.label}
              </Link>
            ) : (
              <button key={s.id} onClick={() => setActive(s.id!)} className={claseNav(active === s.id)}>
                {s.icon}
                {s.label}
              </button>
            )
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-0">
          {/* Mobile section pills */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {SECTIONS.map((s) =>
              s.href ? (
                <Link key={s.href} href={s.href} className={clasePastilla(false)}>
                  {s.icon}
                  {s.label}
                </Link>
              ) : (
                <button key={s.id} onClick={() => setActive(s.id!)} className={clasePastilla(active === s.id)}>
                  {s.icon}
                  {s.label}
                </button>
              )
            )}
          </div>

          {renderSection()}
        </main>
      </div>


      {toast && <Toast msg={toast} onDone={clearToast} />}
    </div>
  );
}
