"use client";
import { TopNav, BottomNav } from "@/components/TopNav";
import { useState, useEffect } from "react";

interface MetricsData {
  totalLeads: number;
  totalAppointments: number;
  conversionRate: number;
  humanInterventions: number;
  aiMessagesHandled: number;
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData({
      totalLeads: 0,
      totalAppointments: 0,
      conversionRate: 0,
      humanInterventions: 0,
      aiMessagesHandled: 0,
    });
    setLoading(false);
  }, []);

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-wa-text-main)]">Panel de Métricas</h1>
          <p className="text-sm text-[var(--color-wa-text-sec)]">Visión general del rendimiento de tu asistente.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] animate-pulse" />
            ))}
          </div>
        ) : data && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-[var(--color-wa-panel-l)] p-4 rounded-2xl border border-[var(--color-wa-sep)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-wa-text-sec)] uppercase tracking-wider">Total Leads</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-wa-text-main)] mt-1">{data.totalLeads}</p>
              <p className="text-xs text-[var(--color-wa-text-sec)] mt-1">Contactos que iniciaron conversación</p>
            </div>

            {/* Card 2 */}
            <div className="bg-[var(--color-wa-panel-l)] p-4 rounded-2xl border border-[var(--color-wa-sep)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-wa-text-sec)] uppercase tracking-wider">Turnos Agendados</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-wa-text-main)] mt-1">{data.totalAppointments}</p>
              <p className="text-xs text-[var(--color-wa-text-sec)] mt-1 flex items-center gap-1">
                Tasa de conversión: <span className="font-semibold text-[var(--color-wa-text-main)]">{data.conversionRate}%</span>
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[var(--color-wa-panel-l)] p-4 rounded-2xl border border-[var(--color-wa-sep)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[var(--color-wa-bg-main)] flex items-center justify-center text-[var(--color-wa-text-main)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-wa-text-sec)] uppercase tracking-wider">Mensajes por IA</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-wa-text-main)] mt-1">{data.aiMessagesHandled}</p>
              <p className="text-xs text-[var(--color-wa-text-sec)] mt-1">Automatizado sin intervención</p>
            </div>

            {/* Card 4 */}
            <div className="bg-[var(--color-wa-panel-l)] p-4 rounded-2xl border border-[var(--color-wa-sep)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-wa-text-sec)] uppercase tracking-wider">Intervenciones Manuales</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-wa-text-main)] mt-1">{data.humanInterventions}</p>
              <p className="text-xs text-amber-500 mt-1">Chats tomados por un humano</p>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
