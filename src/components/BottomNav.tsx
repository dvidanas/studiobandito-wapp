"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function BottomNav() {
  const pathname = usePathname();
  const [newLeadsCount, setNewLeadsCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/leads/stats");
        if (res.ok) {
          const data = await res.json();
          setNewLeadsCount(data.nuevo ?? 0);
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

  const activeClass = "text-[var(--color-wa-green)]";
  const inactiveClass = "text-[var(--color-wa-text-sec)]";

  return (
    <>
      {/* Crédito sobre el nav */}
      <p
        className="md:hidden fixed z-40 left-0 right-0 text-center"
        style={{ bottom: "calc(60px + env(safe-area-inset-bottom))", fontSize: "10px", color: "var(--color-wa-text-sec)", opacity: 0.4, pointerEvents: "none" }}
      >
        Desarrollado por{" "}
        <a href="https://www.feer.com.ar" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", pointerEvents: "auto" }} className="hover:underline">
          Feer
        </a>
      </p>

    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-wa-header)] border-t border-[var(--color-wa-sep)] flex items-center justify-around"
      style={{ height: "calc(60px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Chats */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center gap-1 w-16 h-full ${pathname === "/" ? activeClass : inactiveClass}`}
        title="Chats"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-[10px] font-medium">Chats</span>
      </Link>

      {/* Leads */}
      <Link
        href="/leads"
        className={`flex flex-col items-center justify-center gap-1 w-16 h-full relative ${pathname === "/leads" ? activeClass : inactiveClass}`}
        title="Leads"
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {newLeadsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-wa-green)] text-white text-[10px] font-bold px-1 py-px rounded-full min-w-[16px] text-center">
              {newLeadsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">Leads</span>
      </Link>

      {/* Logout */}
      <button
        onClick={logout}
        className={`flex flex-col items-center justify-center gap-1 w-16 h-full text-red-500`}
        title="Cerrar sesión"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="text-[10px] font-medium">Salir</span>
      </button>
    </nav>
    </>
  );
}
