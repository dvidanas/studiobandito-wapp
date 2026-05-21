"use client";
import { useState, useEffect, useCallback } from "react";
import { TopNav, BottomNav } from "@/components/TopNav";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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

type Selection =
  | { kind: "new-service" }
  | { kind: "edit-service"; item: Service }
  | { kind: "new-promo" }
  | { kind: "edit-promo"; item: Promotion }
  | null;

const INPUT =
  "w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors";

const BTN_PRIMARY =
  "px-5 py-2.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all duration-150";

const BTN_GHOST =
  "px-4 py-2 text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] transition-colors";

// ── Service Form ──────────────────────────────────────────────────────────────

const EMPTY_SVC = { name: "", description: "", price: "", duration_minutes: 30 };

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Service;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { name: initial.name, description: initial.description ?? "", price: initial.price ?? "", duration_minutes: initial.duration_minutes }
      : EMPTY_SVC
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (initial) {
      await fetch(`/api/settings/services/${initial.id}`, {
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
    onSave();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">
        {initial ? "Editar servicio" : "Nuevo servicio"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre *</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="Ej: Corte de cabello" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Precio</label>
          <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className={INPUT} placeholder="Ej: $17.000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Descripción</label>
          <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={INPUT} placeholder="Incluye productos" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Duración (min)</label>
          <input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} className={INPUT} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !form.name.trim()} className={BTN_PRIMARY}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button onClick={onCancel} className={BTN_GHOST}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Promotion Form ────────────────────────────────────────────────────────────

const EMPTY_PROMO = { title: "", description: "", discount: "" };

function PromoForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Promotion;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { title: initial.title, description: initial.description ?? "", discount: initial.discount ?? "" }
      : EMPTY_PROMO
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (initial) {
      await fetch(`/api/promotions/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">
        {initial ? "Editar promoción" : "Nueva promoción"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Título *</label>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={INPUT} placeholder="Ej: Combo especial junio" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Descripción</label>
          <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={INPUT} placeholder="Corte + barba + masaje" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Descuento / Precio</label>
          <input value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} className={INPUT} placeholder="Ej: 10% off o $45.000" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !form.title.trim()} className={BTN_PRIMARY}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button onClick={onCancel} className={BTN_GHOST}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "service"; item: Service } | { kind: "promo"; item: Promotion } | null>(null);

  const loadServices = useCallback(() =>
    fetch("/api/settings/services?all=1").then((r) => r.json()).then(setServices), []);

  const loadPromos = useCallback(() =>
    fetch("/api/promotions").then((r) => r.json()).then(setPromos), []);

  useEffect(() => { loadServices(); loadPromos(); }, [loadServices, loadPromos]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "service") {
      await fetch(`/api/settings/services/${deleteTarget.item.id}`, { method: "DELETE" });
      loadServices();
      if (selection && "item" in selection && (selection as { item: Service }).item?.id === deleteTarget.item.id) setSelection(null);
    } else {
      await fetch(`/api/promotions/${deleteTarget.item.id}`, { method: "DELETE" });
      loadPromos();
      if (selection && "item" in selection && (selection as { item: Promotion }).item?.id === deleteTarget.item.id) setSelection(null);
    }
    setDeleteTarget(null);
  };

  const toggleService = async (s: Service) => {
    await fetch(`/api/settings/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: s.active ? 0 : 1 }),
    });
    loadServices();
  };

  const togglePromo = async (p: Promotion) => {
    await fetch(`/api/promotions/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: p.active ? 0 : 1 }),
    });
    loadPromos();
  };

  const RightPanel = () => {
    if (!selection) {
      return (
        <div className="flex-1 flex items-center justify-center text-[var(--color-wa-text-sec)] text-sm">
          Seleccioná un servicio o promoción para editar, o creá uno nuevo.
        </div>
      );
    }
    if (selection.kind === "new-service") {
      return <ServiceForm onSave={() => { loadServices(); setSelection(null); }} onCancel={() => setSelection(null)} />;
    }
    if (selection.kind === "edit-service") {
      return <ServiceForm initial={selection.item} onSave={() => { loadServices(); setSelection(null); }} onCancel={() => setSelection(null)} />;
    }
    if (selection.kind === "new-promo") {
      return <PromoForm onSave={() => { loadPromos(); setSelection(null); }} onCancel={() => setSelection(null)} />;
    }
    if (selection.kind === "edit-promo") {
      return <PromoForm initial={selection.item} onSave={() => { loadPromos(); setSelection(null); }} onCancel={() => setSelection(null)} />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <div className="flex-1 flex min-h-0 md:p-3 md:gap-3 overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-full md:w-[350px] flex-shrink-0 flex flex-col bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden border-r md:border border-[var(--color-wa-sep)]" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex-1 overflow-y-auto">

            {/* Servicios */}
            <div className="px-4 pt-4 pb-2">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">Servicios</span>
            </div>

            <ul className="px-2 pb-2 flex flex-col gap-1">
              {services.length === 0 && (
                <li className="px-3 py-3 text-sm text-[var(--color-wa-text-sec)]">Sin servicios aún.</li>
              )}
              {services.map((s) => (
                <li key={s.id}>
                  <div
                    onClick={() => setSelection({ kind: "edit-service", item: s })}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      selection && "item" in selection && (selection as { item: Service }).item?.id === s.id
                        ? "bg-[var(--color-wa-green)]/10"
                        : "hover:bg-[var(--color-wa-hover)]"
                    } ${!s.active ? "opacity-50" : ""}`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.active ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-wa-text-main)] truncate">{s.name}</p>
                      <p className="text-xs text-[var(--color-wa-text-sec)] truncate">{s.price ? `${s.price} · ` : ""}{s.duration_minutes} min</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleService(s)} className="p-1 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]" title={s.active ? "Desactivar" : "Activar"}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {s.active
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          }
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTarget({ kind: "service", item: s })} className="p-1 rounded hover:bg-[var(--color-wa-hover)] text-red-500" title="Eliminar">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mx-4 border-t border-[var(--color-wa-sep)]" />

            {/* Promociones */}
            <div className="px-4 pt-4 pb-2">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">Promociones</span>
            </div>

            <ul className="px-2 pb-4 flex flex-col gap-1">
              {promos.length === 0 && (
                <li className="px-3 py-3 text-sm text-[var(--color-wa-text-sec)]">Sin promociones aún.</li>
              )}
              {promos.map((p) => (
                <li key={p.id}>
                  <div
                    onClick={() => setSelection({ kind: "edit-promo", item: p })}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      selection && "item" in selection && (selection as { item: Promotion }).item?.id === p.id
                        ? "bg-[var(--color-wa-green)]/10"
                        : "hover:bg-[var(--color-wa-hover)]"
                    } ${!p.active ? "opacity-50" : ""}`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.active ? "bg-amber-400" : "bg-[var(--color-wa-sep)]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-wa-text-main)] truncate">{p.title}</p>
                      {p.discount && <p className="text-xs text-amber-500 truncate">{p.discount}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => togglePromo(p)} className="p-1 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]" title={p.active ? "Desactivar" : "Activar"}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {p.active
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          }
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTarget({ kind: "promo", item: p })} className="p-1 rounded hover:bg-[var(--color-wa-hover)] text-red-500" title="Eliminar">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Right panel — hidden on mobile when nothing selected */}
        <main className={`flex-1 min-w-0 bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden ${!selection ? "hidden md:flex" : "flex"} flex-col`} style={{ boxShadow: "var(--shadow-card)" }}>
          {/* Header */}
          <div className="px-6 md:px-8 py-3 flex items-center justify-between border-b border-[var(--color-wa-sep)] flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Servicios &amp; Promociones</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelection({ kind: "new-service" })}
                className="text-sm font-semibold text-[var(--color-wa-green)] hover:underline"
              >
                + Servicio
              </button>
              <button
                onClick={() => setSelection({ kind: "new-promo" })}
                className="text-sm font-semibold text-[var(--color-wa-green)] hover:underline"
              >
                + Promoción
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <RightPanel />
          </div>
        </main>
      </div>

      <BottomNav />

      {deleteTarget && (
        <ConfirmDialog
          message={
            deleteTarget.kind === "service"
              ? `¿Eliminar el servicio "${deleteTarget.item.name}"? Esta acción no se puede deshacer.`
              : `¿Eliminar la promoción "${deleteTarget.item.title}"? Esta acción no se puede deshacer.`
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
