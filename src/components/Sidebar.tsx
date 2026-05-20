"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clientConfig } from "@/lib/client.config";

const initials = clientConfig.businessName.charAt(0).toUpperCase();

export function Sidebar() {
  const pathname = usePathname();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const navLink = (href: string, label: string, icon: ReactNode) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
        pathname === href ? "bg-[var(--color-wa-hover)]" : "hover:bg-[var(--color-wa-hover)]"
      }`}
      title={label}
    >
      {icon}
      <span className="hidden lg:block font-medium text-[var(--color-wa-text-main)]">{label}</span>
    </Link>
  );

  return (
    <aside className="hidden md:flex md:w-16 lg:w-64 bg-[var(--color-wa-panel-l)] border-r border-[var(--color-wa-sep)] flex-col flex-shrink-0 transition-all duration-200">
      {/* Header */}
      <div className="h-16 flex items-center justify-center lg:justify-start px-4 border-b border-[var(--color-wa-sep)] flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-[var(--color-wa-green)] flex items-center justify-center text-[var(--color-wa-green-text)] font-bold flex-shrink-0 text-base">
          {initials}
        </div>
        <div className="ml-3 hidden lg:flex flex-col min-w-0">
          <span className="font-semibold text-[var(--color-wa-text-main)] leading-tight truncate">
            {clientConfig.businessName}
          </span>
          <span className="text-xs text-[var(--color-wa-text-sec)]">Panel de gestión</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navLink("/", "Mensajes",
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {navLink("/appointments", "Turnos",
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {navLink("/services", "Servicios",
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )}
        {navLink("/staff", "Personal",
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        {navLink("/settings", "Configuración",
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-[var(--color-wa-sep)]">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors w-full text-red-500"
          title="Cerrar sesión"
        >
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden lg:block font-medium">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
