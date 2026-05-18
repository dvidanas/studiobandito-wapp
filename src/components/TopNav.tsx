"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clientConfig } from "@/lib/client.config";

const TABS = [
  {
    href: "/",
    label: "Mensajes",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/appointments",
    label: "Turnos",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Configuración",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function TopNav() {
  const pathname = usePathname();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="h-14 flex-shrink-0 flex items-stretch bg-[var(--color-wa-header)] border-b border-[var(--color-wa-sep)] z-40">
      {/* Left: name */}
      <div className="flex items-center px-4 flex-shrink-0">
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-[var(--color-wa-text-main)]">{clientConfig.businessName}</span>
          <span className="text-[10px] text-[var(--color-wa-text-sec)] mt-0.5">Panel de gestión</span>
        </div>
      </div>

      {/* Center: tabs — desktop only */}
      <nav className="flex-1 hidden md:flex items-center justify-center">
        <div className="inline-flex items-center bg-[#f1f3f4] dark:bg-[var(--color-wa-hover)] rounded-xl p-1 gap-0.5">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.label}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--color-wa-panel-l)] text-[var(--color-wa-text-main)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                    : "text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
                }`}
              >
                {tab.icon}
                <span className="hidden md:block">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right: logout */}
      <div className="flex items-center px-3 flex-shrink-0">
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-2 rounded-lg text-[var(--color-wa-text-sec)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden flex-shrink-0 bg-white dark:bg-[var(--color-wa-panel-l)] border-t border-[var(--color-wa-sep)] flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2.5 transition-colors ${
              isActive
                ? "text-[var(--color-wa-green)]"
                : "text-[var(--color-wa-text-sec)]"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
