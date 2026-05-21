"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ConnectionGate } from "@/components/ConnectionGate";
import { TopNav, BottomNav } from "@/components/TopNav";
import { ConversationList } from "@/components/ConversationList";
import { ConversationPanel } from "@/components/ConversationPanel";
import { PullToRefresh } from "@/components/PullToRefresh";

type ChatFilter = "todos" | "leads" | "sinleer" | "bot";
const CHAT_FILTERS: { key: ChatFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "leads", label: "Leads" },
  { key: "sinleer", label: "Sin leer" },
  { key: "bot", label: "Bot activo" },
];

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  has_lead: number;
  last_message_at: number | null;
  created_at: number;
}

function Dashboard({ connectionStatus }: { connectionStatus: { status: string; phone?: string; quality?: string; message?: string } }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatFilter, setChatFilter] = useState<ChatFilter>("todos");
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const id = searchParams.get("id");
    return id ? parseInt(id, 10) : null;
  });
  const [mobileView, setMobileView] = useState<"list" | "conversation">(() =>
    searchParams.get("id") ? "conversation" : "list"
  );
  
  const prevConversations = useRef<Conversation[]>([]);
  
  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
  
  // Play sound function
  const playAlertSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio API no soportada", e);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data: Conversation[] = await res.json();
        
        // Check for updates to trigger notifications
        if (prevConversations.current.length > 0) {
          for (const conv of data) {
            const prev = prevConversations.current.find(p => p.id === conv.id);
            if (prev) {
              // Notification: AI handed over to Human
              if (prev.mode === "AI" && conv.mode === "HUMAN") {
                playAlertSound();
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("Asistencia Requerida", {
                    body: `La IA ha derivado a un humano en el chat con ${conv.name ?? "+" + conv.phone}`,
                    icon: "/favicon.ico"
                  });
                }
              }
              // Notification: New message in Human mode
              else if (conv.mode === "HUMAN" && conv.last_message_at !== prev.last_message_at && conv.last_message_at) {
                playAlertSound();
                if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
                  new Notification("Nuevo Mensaje", {
                    body: `Nuevo mensaje de ${conv.name ?? "+" + conv.phone}`,
                    icon: "/favicon.ico"
                  });
                }
              }
            }
          }
        }
        
        prevConversations.current = data;
        setConversations(data);
      }
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 2000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const filteredConversations = useMemo(() => {
    switch (chatFilter) {
      case "leads": return conversations.filter((c) => c.has_lead === 1);
      case "sinleer": return conversations.filter((c) => c.last_message_at !== null && c.last_message_at > Date.now() / 1000 - 3600);
      case "bot": return conversations.filter((c) => c.mode === "AI");
      default: return conversations;
    }
  }, [conversations, chatFilter]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  function handleSelect(id: number) {
    setSelectedId(id);
    setMobileView("conversation");
  }

  function handleBack() {
    setMobileView("list");
  }

  function handleModeChange(id: number, mode: "AI" | "HUMAN") {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, mode } : c))
    );
  }

  function handleDelete(id: number) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setMobileView("list");
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <PullToRefresh onRefresh={fetchConversations} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden md:p-3 md:gap-3">

          {/* List column — full width on mobile, card on md+ */}
          <aside className={`
            ${mobileView === "conversation" ? "hidden" : "flex"} md:flex
            w-full md:w-[350px] md:flex-shrink-0
            bg-white dark:bg-[var(--color-wa-panel-l)] flex-col
            md:rounded-2xl md:shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:overflow-hidden
          `}>
            <div className="relative px-4 py-3 border-b border-[var(--color-wa-sep)] flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Mensajes</h2>
              {connectionStatus.phone && (
                <span className="text-sm font-medium text-[var(--color-wa-text-sec)] absolute left-1/2 -translate-x-1/2">
                  +{connectionStatus.phone}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus.status === "connected" ? "bg-green-500" : "bg-red-500"}`} />
              </div>
            </div>

            <div className="p-2 border-b border-[var(--color-wa-sep)] flex-shrink-0">
              <div className="bg-[var(--color-wa-bg-main)] rounded-lg px-3 py-1.5 flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" placeholder="Buscar o iniciar un nuevo chat" className="bg-transparent border-none outline-none text-sm w-full text-[var(--color-wa-text-main)] placeholder-[var(--color-wa-text-sec)]" />
              </div>
            </div>

            {/* Filter chips */}
            <div className="px-3 py-2 flex gap-1.5 border-b border-[var(--color-wa-sep)] flex-shrink-0 overflow-x-auto scrollbar-hide">
              {CHAT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setChatFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    chatFilter === f.key
                      ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                      : "bg-[var(--color-wa-bg-main)] text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>
          </aside>

          {/* Panel column — full width on mobile, card flex-1 on md+ */}
          <main className={`
            ${mobileView === "list" ? "hidden" : "flex"} md:flex
            flex-1 bg-white dark:bg-[var(--color-wa-panel-r)] flex-col
            md:rounded-2xl md:shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:overflow-hidden
          `}>
            {selectedConversation ? (
              <ConversationPanel
                key={selectedConversation.id}
                conversation={selectedConversation}
                onModeChange={handleModeChange}
                onDelete={handleDelete}
                onBack={handleBack}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-[200px] sm:w-[280px] mb-8">
                  <svg viewBox="0 0 100 100" className="w-full text-[var(--color-wa-text-sec)] opacity-20">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M50 25v25l15 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-light text-[var(--color-wa-text-main)] mb-4">
                  Amalia, asistente de Studio Bandito
                </h1>
                <p className="text-sm text-[var(--color-wa-text-sec)] max-w-md">
                  Seleccioná un chat para ver los mensajes.
                </p>
              </div>
            )}
          </main>

          </div>
        </PullToRefresh>
      </div>
      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <ConnectionGate>
      {(status) => (
        <Suspense fallback={null}>
          <Dashboard connectionStatus={status} />
        </Suspense>
      )}
    </ConnectionGate>
  );
}
