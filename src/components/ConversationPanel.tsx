"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  created_at: number;
}

interface Message {
  id: number;
  role: "user" | "assistant" | "human";
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

interface Props {
  conversation: Conversation;
  onModeChange: (id: number, mode: "AI" | "HUMAN") => void;
  onDelete: (id: number) => void;
}

export function ConversationPanel({ conversation, onModeChange, onDelete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"AI" | "HUMAN">(conversation.mode);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<{ message: string; is24h: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${conversation.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // silencioso — el usuario ve los mensajes previos
    }
  }, [conversation.id]);

  // Reiniciar al cambiar de conversación
  useEffect(() => {
    setMode(conversation.mode);
    setInput("");
    setSendError(null);
    setConfirmDelete(false);
    fetchMessages();
  }, [conversation.id, conversation.mode, fetchMessages]);

  // Polling cada 2 segundos
  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    setInput("");

    const res = await fetch(`/api/messages/${conversation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });

    const data = await res.json();
    setSending(false);

    if (!res.ok || !data.ok) {
      setSendError({ message: data.error ?? "Error al enviar", is24h: !!data.is24hError });
      // Recargar para mostrar el mensaje guardado igual
      fetchMessages();
    } else {
      fetchMessages();
    }
  }

  function handleModeChange(newMode: "AI" | "HUMAN") {
    setMode(newMode);
    onModeChange(conversation.id, newMode);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
    onDelete(conversation.id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
            {(conversation.name ?? conversation.phone).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {conversation.name ?? `+${conversation.phone}`}
            </p>
            <p className="text-xs text-gray-400">+{conversation.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ModeToggle
            conversationId={conversation.id}
            mode={mode}
            onChange={handleModeChange}
          />
          <button
            onClick={handleDelete}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-gray-400 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            {confirmDelete ? "¿Confirmar?" : "Borrar"}
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Sin mensajes</p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error 24h */}
      {sendError?.is24h && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            Fuera de la ventana de 24 h
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            El contacto debe escribirte primero para reabrir la ventana de conversación.
          </p>
        </div>
      )}
      {sendError && !sendError.is24h && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs text-red-700">{sendError.message}</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        {mode === "AI" ? (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl">
            <svg
              className="w-4 h-4 text-emerald-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l1.196 4.786A1.875 1.875 0 0119.128 21H4.872a1.875 1.875 0 01-1.868-1.714L4.2 14.5"
              />
            </svg>
            <span className="text-sm text-gray-500">
              Modo IA activo — el bot responde automáticamente
            </span>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Escribir mensaje..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {sending ? "..." : "Enviar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
