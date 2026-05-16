"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Sidebar({ newLeadsCount: propCount }: { newLeadsCount?: number }) {
  const pathname = usePathname();
  const [fetchedCount, setFetchedCount] = useState<number | null>(null);

  const newLeadsCount = fetchedCount ?? propCount ?? 0;

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/leads/stats");
        if (res.ok) {
          const data = await res.json();
          setFetchedCount(data.nuevo ?? 0);
        }
      } catch {
        // silencioso
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="hidden md:flex md:w-16 lg:w-64 bg-[var(--color-wa-panel-l)] border-r border-[var(--color-wa-sep)] flex-col flex-shrink-0 transition-all duration-200">
      {/* Top: Profile / Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start px-4 border-b border-[var(--color-wa-sep)] flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-[var(--color-wa-green)] flex items-center justify-center text-white font-bold flex-shrink-0">
          F
        </div>
        <span className="ml-3 font-semibold text-[var(--color-wa-text-main)] hidden lg:block">
          Feer
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
            pathname === "/" ? "bg-[var(--color-wa-hover)]" : "hover:bg-[var(--color-wa-hover)]"
          }`}
          title="Chats"
        >
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="hidden lg:block font-medium text-[var(--color-wa-text-main)]">Chats</span>
        </Link>

        <Link
          href="/leads"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative ${
            pathname === "/leads" ? "bg-[var(--color-wa-hover)]" : "hover:bg-[var(--color-wa-hover)]"
          }`}
          title="Leads"
        >
          <div className="relative flex-shrink-0">
            <svg className="w-6 h-6 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {newLeadsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-wa-green)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {newLeadsCount}
              </span>
            )}
          </div>
          <span className="hidden lg:block font-medium text-[var(--color-wa-text-main)] flex-1">Leads</span>
          {newLeadsCount > 0 && (
            <span className="hidden lg:flex bg-[var(--color-wa-green)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {newLeadsCount}
            </span>
          )}
        </Link>

        <Link
          href="/appointments"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
            pathname === "/appointments" ? "bg-[var(--color-wa-hover)]" : "hover:bg-[var(--color-wa-hover)]"
          }`}
          title="Turnos"
        >
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden lg:block font-medium text-[var(--color-wa-text-main)]">Turnos</span>
        </Link>
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-[var(--color-wa-sep)] flex flex-col gap-2">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
            pathname === "/settings" ? "bg-[var(--color-wa-hover)]" : "hover:bg-[var(--color-wa-hover)]"
          }`}
          title="Configuración"
        >
          <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden lg:block font-medium text-[var(--color-wa-text-main)]">Configuración</span>
        </Link>

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
