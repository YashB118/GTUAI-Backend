"use client";

import { Trash2, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
  subjects?: { name: string; code: string };
}

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function ChatSidebar({ sessions, activeId, onSelect, onNew, onDelete, loading }: Props) {
  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-bg-card h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">History</span>
        <button
          onClick={onNew}
          className="p-1 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          title="New chat"
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading && (
          <div className="px-3 py-6 text-center text-xs text-text-muted">Loading...</div>
        )}
        {!loading && !sessions.length && (
          <div className="px-3 py-6 text-center text-xs text-text-muted">No chats yet</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
              activeId === s.id ? "bg-accent/10 text-accent" : "hover:bg-bg-elevated text-text-secondary"
            )}
            onClick={() => onSelect(s.id)}
          >
            <MessageSquare size={13} className="shrink-0 opacity-60" />
            <span className="flex-1 text-xs truncate">{s.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
