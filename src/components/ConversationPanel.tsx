"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";
import { ConfirmDialog } from "./ConfirmDialog";

interface Conversation {
  id: number;
  phone: string;
  jid?: string | null;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  created_at: number;
  last_message_content?: string | null;
  last_message_role?: "user" | "assistant" | "human" | null;
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
  onBack?: () => void;
}

export function ConversationPanel({ conversation, onModeChange, onDelete, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"AI" | "HUMAN">(conversation.mode);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<{ message: string; is24h: boolean } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    setShowDeleteConfirm(false);
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

  async function confirmDeleteConversation() {
    setShowDeleteConfirm(false);
    await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
    onDelete(conversation.id);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-wa-panel-r)]">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[var(--color-wa-header)] flex-shrink-0 border-b border-[var(--color-wa-sep)]">
        <div className="flex items-center gap-4 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -ml-1 flex-shrink-0 text-[var(--color-wa-text-sec)] active:text-[var(--color-wa-text-main)]"
              aria-label="Volver"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex flex-col">
            <p className="text-base font-medium text-[var(--color-wa-text-main)] truncate">
              {conversation.name ?? (conversation.jid?.endsWith("@lid") ? "Contacto" : `+${conversation.phone}`)}
            </p>
            {!conversation.jid?.endsWith("@lid") && (
              <p className="text-xs text-[var(--color-wa-text-sec)] truncate">
                +{conversation.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <ModeToggle
            conversationId={conversation.id}
            mode={mode}
            onChange={handleModeChange}
          />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-colors text-[var(--color-wa-text-sec)] hover:text-red-500 hover:bg-[var(--color-wa-hover)]"
          >
            Borrar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-16 lg:px-24 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="bg-[var(--color-wa-bubble-in)] text-[var(--color-wa-text-sec)] text-xs px-4 py-1.5 rounded-lg shadow-sm">
              Envía un mensaje para iniciar el chat
            </span>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error 24h */}
      {sendError?.is24h && (
        <div className="mx-[5%] sm:mx-[10%] mb-2 bg-red-900/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-500">
            Fuera de la ventana de 24 h
          </p>
          <p className="text-xs text-red-400 mt-0.5">
            El contacto debe escribirte primero para reabrir la ventana de conversación.
          </p>
        </div>
      )}
      {sendError && !sendError.is24h && (
        <div className="mx-[5%] sm:mx-[10%] mb-2 bg-red-900/10 border border-red-500/20 rounded-lg px-3 py-2">
          <p className="text-xs text-red-500">{sendError.message}</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-[var(--color-wa-header)] flex-shrink-0 flex gap-3 items-end">
        {mode === "AI" ? (
          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-wa-input)] rounded-lg shadow-sm border border-[var(--color-wa-sep)]">
            <svg
              className="w-5 h-5 text-[var(--color-wa-green)] flex-shrink-0"
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
            <span className="text-sm text-[var(--color-wa-text-sec)]">
              Modo IA activo — el bot responde automáticamente
            </span>
          </div>
        ) : (
          <div className="flex-1 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe un mensaje"
              disabled={sending}
              rows={1}
              className="flex-1 px-4 py-2.5 bg-[var(--color-wa-input)] text-[var(--color-wa-text-main)] rounded-lg text-sm focus:outline-none placeholder-[var(--color-wa-text-sec)] disabled:opacity-50 resize-none max-h-32"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-11 h-11 flex-shrink-0 rounded-full bg-[var(--color-wa-green)] hover:bg-[var(--color-wa-green-dark)] flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm text-[var(--color-wa-green-text)]"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`¿Eliminar la conversación con ${conversation.name ?? (conversation.jid?.endsWith("@lid") ? "Contacto" : `+${conversation.phone}`)}? Esta acción no se puede deshacer.`}
          onConfirm={confirmDeleteConversation}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
