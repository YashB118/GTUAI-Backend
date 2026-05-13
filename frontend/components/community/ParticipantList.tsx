"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Participant {
  pseudonym: string;
}

interface Props {
  participants: Participant[];
  myPseudonym: string | null;
  typingUsers: string[];
}

function avatarColor(pseudonym: string): string {
  const colors = [
    "bg-blue-500/20 text-blue-300",
    "bg-purple-500/20 text-purple-300",
    "bg-green-500/20 text-green-300",
    "bg-yellow-500/20 text-yellow-300",
    "bg-pink-500/20 text-pink-300",
    "bg-cyan-500/20 text-cyan-300",
    "bg-orange-500/20 text-orange-300",
  ];
  let hash = 0;
  for (const c of pseudonym) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

export function ParticipantList({ participants, myPseudonym, typingUsers }: Props) {
  return (
    <aside className="w-52 shrink-0 flex flex-col border-l border-border/50 bg-bg-primary/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <Users size={14} className="text-text-muted" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Online ({participants.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
        {participants.map((p) => {
          const isMe = p.pseudonym === myPseudonym;
          const isTyping = typingUsers.includes(p.pseudonym);
          return (
            <div
              key={p.pseudonym}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-elevated/50 transition-colors"
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                  avatarColor(p.pseudonym)
                )}
              >
                {p.pseudonym.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium truncate", isMe ? "text-accent" : "text-text-primary")}>
                  {p.pseudonym}
                  {isMe && <span className="ml-1 text-[10px] text-text-muted">(you)</span>}
                </p>
                {isTyping && (
                  <p className="text-[10px] text-text-muted italic">typing…</p>
                )}
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
