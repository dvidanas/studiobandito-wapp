"use client";
import { useState } from "react";

interface Lead {
  id: number;
  phone: string;
  name: string | null;
  business: string | null;
  problem: string | null;
  status: "nuevo" | "seguimiento" | "cerrado" | "descartado";
  summary: string | null;
  created_at: number;
  conv_phone: string;
  conv_name: string | null;
}

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (id: number) => void;
  onStatusChange: (id: number, status: Lead["status"]) => void;
}

const COLUMNS: { id: Lead["status"]; label: string; color: string }[] = [
  { id: "nuevo", label: "Nuevo", color: "border-blue-500" },
  { id: "seguimiento", label: "Seguimiento", color: "border-yellow-500" },
  { id: "cerrado", label: "Cerrado", color: "border-[var(--color-wa-green)]" },
  { id: "descartado", label: "Descartado", color: "border-[var(--color-wa-sep)]" },
];

function displayName(lead: Lead): string {
  return lead.conv_name ?? lead.name ?? `+${lead.conv_phone}`;
}

export function KanbanBoard({ leads, onSelectLead, onStatusChange }: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);

  const handleDragStart = (id: number) => {
    setDraggedLeadId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: Lead["status"]) => {
    if (draggedLeadId !== null) {
      onStatusChange(draggedLeadId, status);
      setDraggedLeadId(null);
    }
  };

  return (
    <div className="flex-1 flex gap-4 overflow-x-auto pb-4 h-full">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.id);
        
        return (
          <div
            key={col.id}
            className="flex flex-col w-80 flex-shrink-0 bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(col.id)}
          >
            <div className={`px-4 py-3 bg-[var(--color-wa-header)] border-b-2 ${col.color}`}>
              <h3 className="font-semibold text-[var(--color-wa-text-main)] flex items-center justify-between">
                {col.label}
                <span className="text-xs bg-[var(--color-wa-bg-main)] text-[var(--color-wa-text-sec)] px-2 py-0.5 rounded-full border border-[var(--color-wa-sep)]">
                  {columnLeads.length}
                </span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--color-wa-bg-main)]/30">
              {columnLeads.map((lead) => {
                const name = displayName(lead);
                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead.id)}
                    onClick={() => onSelectLead(lead.id)}
                    className="bg-[var(--color-wa-panel-l)] p-4 rounded-xl border border-[var(--color-wa-sep)] shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
                  >
                    <h4 className="font-medium text-[var(--color-wa-text-main)] text-sm mb-1 line-clamp-1">{name}</h4>
                    <p className="text-xs text-[var(--color-wa-text-sec)] line-clamp-2">
                      {lead.business || lead.problem || `Sin detalles adicionales`}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--color-wa-text-sec)] font-medium bg-[var(--color-wa-bg-main)] px-1.5 py-0.5 rounded">
                        {new Date(lead.created_at * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
