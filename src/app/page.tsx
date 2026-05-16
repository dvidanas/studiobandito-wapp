"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ConnectionGate } from "@/components/ConnectionGate";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { ConversationList } from "@/components/ConversationList";
import { ConversationPanel } from "@/components/ConversationPanel";

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
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const id = searchParams.get("id");
    return id ? parseInt(id, 10) : null;
  });
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
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
    <div className="flex h-[calc(100dvh-60px)] md:h-dvh bg-[var(--color-wa-bg-main)]">
      {/* 1. Sidebar — hidden on mobile, icon-only on tablet, full on desktop */}
      <Sidebar />

      {/* 2. List column — full width on mobile, fixed width on md+ */}
      <aside className={`
        ${mobileView === "conversation" ? "hidden" : "flex"} md:flex
        w-full md:w-[340px] md:flex-shrink-0
        bg-[var(--color-wa-panel-l)] border-r border-[var(--color-wa-sep)] flex-col
      `}>
        <div className="px-4 py-3 bg-[var(--color-wa-header)] border-b border-[var(--color-wa-sep)] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">Chats</h2>
            {connectionStatus.phone && (
              <p className="text-sm text-[var(--color-wa-text-sec)]">+{connectionStatus.phone}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus.status === "connected" ? "bg-[var(--color-wa-green)]" : "bg-red-500"}`} />
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

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </aside>

      {/* 3. Panel column — full width on mobile, flex-1 on md+ */}
      <main className={`
        ${mobileView === "list" ? "hidden" : "flex"} md:flex
        flex-1 bg-[var(--color-wa-panel-r)] flex-col
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
          <div className="flex flex-col items-center justify-center h-full text-center px-8 border-b-[6px] border-[var(--color-wa-green)]">
            <div className="w-[200px] sm:w-[320px] mb-8">
              <svg viewBox="0 0 100 100" className="w-full text-[var(--color-wa-text-sec)] opacity-20">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M50 25v25l15 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-[var(--color-wa-text-main)] mb-4">
              Feer WhatsApp Agent
            </h1>
            <p className="text-sm text-[var(--color-wa-text-sec)] max-w-md">
              Seleccioná un chat para ver los mensajes.
            </p>
          </div>
        )}
      </main>

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
