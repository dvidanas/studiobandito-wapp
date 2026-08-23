"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clientConfig } from "@/lib/client.config";

// Portado del patrón del panel de Pasta Lovers, sin el filtrado por roles:
// Bandito tiene un único login por PIN, así que todas las secciones son
// visibles siempre.

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    href: "/",
    label: "Turnos",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/clients",
    label: "Clientes",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Mensajes",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/metrics",
    label: "Métricas",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
      </svg>
    ),
  },
  {
    href: "/staff",
    label: "Personal",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/config",
    label: "Config",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function esActivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [esOscuro, setEsOscuro] = useState(false);

  // El tema inicial lo aplica el script anti-flash de app/layout.tsx; acá solo
  // lo leemos para que el botón muestre el ícono correcto.
  useEffect(() => {
    setEsOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTema = () => {
    const nuevoEstado = !esOscuro;
    setEsOscuro(nuevoEstado);
    document.documentElement.classList.toggle("dark", nuevoEstado);
    try {
      localStorage.setItem("theme", nuevoEstado ? "dark" : "light");
    } catch {
      // Storage bloqueado: el tema cambia igual, solo no se recuerda.
    }
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const marca = (onNavigate?: () => void) => (
    <div className="flex flex-col gap-1.5 min-w-0">
      <Link href="/" className="block" onClick={onNavigate}>
        <span className="text-base font-bold text-[var(--color-wa-text-main)] truncate">
          {clientConfig.businessName}
        </span>
      </Link>
      <span className="text-[10px] text-[var(--color-wa-text-sec)] font-semibold tracking-wider uppercase">
        Panel de gestión
      </span>
    </div>
  );

  const renderLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1.5">
      {TABS.map((item) => {
        const activo = esActivo(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold flex items-center gap-3 transition-all duration-200 ${
              activo
                ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] shadow-sm"
                : "text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)]"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1 text-[var(--color-wa-text-sec)]">
        <button
          onClick={toggleTema}
          className="p-1.5 rounded-lg hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)] transition-all cursor-pointer"
          title={esOscuro ? "Modo claro" : "Modo oscuro"}
          type="button"
        >
          {esOscuro ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <div className="border-t border-[var(--color-wa-sep)] pt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] flex items-center justify-center font-bold text-xs shrink-0">
            {clientConfig.businessName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-wa-text-main)] truncate leading-none mb-0.5">
              {clientConfig.businessName}
            </p>
            <p className="text-[11px] text-[var(--color-wa-text-sec)] leading-none">Administración</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-[var(--color-wa-text-sec)] hover:text-red-500 transition-colors shrink-0 cursor-pointer"
        >
          Salir
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar de escritorio */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[240px] bg-[var(--color-wa-panel-l)] border-r border-[var(--color-wa-sep)] px-6 py-8 gap-8 z-30">
        {marca()}
        <div className="flex-1">{renderLinks()}</div>
        {renderFooter()}
      </aside>

      {/* Barra superior en móvil */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-[var(--color-wa-header)] border-b border-[var(--color-wa-sep)] px-5 flex items-center justify-between h-16">
        {marca()}
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="text-[var(--color-wa-text-main)] p-2 focus:outline-none cursor-pointer flex flex-col gap-1.5 justify-center items-end"
        >
          <span className="block w-6 h-0.5 bg-current rounded-full" />
          <span className="block w-4 h-0.5 bg-current rounded-full" />
          <span className="block w-6 h-0.5 bg-current rounded-full" />
        </button>
      </div>

      {/* Drawer en móvil */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${
          abierto ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
            abierto ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setAbierto(false)}
        />
        <div
          className={`absolute top-0 bottom-0 right-0 w-72 max-w-[80%] bg-[var(--color-wa-panel-l)] shadow-xl px-6 py-8 flex flex-col gap-8 transform transition-transform duration-300 ease-in-out border-l border-[var(--color-wa-sep)] ${
            abierto ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            {marca(() => setAbierto(false))}
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] text-2xl leading-none p-1 focus:outline-none cursor-pointer"
            >
              ×
            </button>
          </div>
          <div className="flex-1">{renderLinks(() => setAbierto(false))}</div>
          {renderFooter()}
        </div>
      </div>
    </>
  );
}
