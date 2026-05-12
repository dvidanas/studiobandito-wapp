"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Sidebar({ newLeadsCount = 0 }: { newLeadsCount?: number }) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="w-[80px] sm:w-[280px] bg-[var(--color-wa-panel-l)] border-r border-[var(--color-wa-sep)] flex flex-col flex-shrink-0 transition-colors">
      {/* Top: Profile / Logo */}
      <div className="h-16 flex items-center justify-center sm:justify-start px-4 border-b border-[var(--color-wa-sep)] flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-[var(--color-wa-green)] flex items-center justify-center text-white font-bold flex-shrink-0">
          F
        </div>
        <span className="ml-3 font-semibold text-[var(--color-wa-text-main)] hidden sm:block">
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
          <span className="hidden sm:block font-medium text-[var(--color-wa-text-main)]">Chats</span>
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
          <span className="hidden sm:block font-medium text-[var(--color-wa-text-main)] flex-1">Leads</span>
          {newLeadsCount > 0 && (
            <span className="hidden sm:flex bg-[var(--color-wa-green)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {newLeadsCount}
            </span>
          )}
        </Link>
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-[var(--color-wa-sep)] flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors w-full"
          title={isDark ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDark ? (
            <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-[var(--color-wa-text-sec)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span className="hidden sm:block font-medium text-[var(--color-wa-text-main)]">
            {isDark ? "Modo Claro" : "Modo Oscuro"}
          </span>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors w-full text-red-500"
          title="Cerrar sesión"
        >
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:block font-medium">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
