"use client";
import { useState, useEffect, useCallback } from "react";
import { ConnectionGate } from "@/components/ConnectionGate";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ConversationList } from "@/components/ConversationList";
import { ConversationPanel } from "@/components/ConversationPanel";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  created_at: number;
}

function Dashboard({ connectionStatus }: { connectionStatus: { status: string; phone?: string; quality?: string; message?: string } }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  // Carga inicial + polling cada 2s
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 2000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  function handleModeChange(id: number, mode: "AI" | "HUMAN") {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, mode } : c))
    );
  }

  function handleDelete(id: number) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DashboardHeader
        initialStatus={{
          status: connectionStatus.status as "connected" | "error" | "missing_config" | "loading",
          phone: connectionStatus.phone,
          quality: connectionStatus.quality,
          message: connectionStatus.message,
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — lista de conversaciones */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Conversaciones
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </aside>

        {/* Panel principal */}
        <main className="flex-1 overflow-hidden">
          {selectedConversation ? (
            <ConversationPanel
              key={selectedConversation.id}
              conversation={selectedConversation}
              onModeChange={handleModeChange}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">
                Seleccioná una conversación
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Los chats aparecen cuando alguien escribe al número de WhatsApp
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <ConnectionGate>
      {(status) => <Dashboard connectionStatus={status} />}
    </ConnectionGate>
  );
}
