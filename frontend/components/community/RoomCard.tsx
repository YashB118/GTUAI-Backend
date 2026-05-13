"use client";

import { Users, Clock, Lock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    subject: string;
    description?: string;
    is_public: boolean;
    participant_count: number;
    max_participants: number;
    last_activity_at: string;
    message_retention: string;
  };
  onJoin: (roomId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const isFull = room.participant_count >= room.max_participants;

  return (
    <div className="group glass border border-border/50 rounded-2xl p-4 hover:border-accent/30 transition-all duration-200 hover:shadow-lg hover:shadow-accent/5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {room.is_public ? (
              <Globe size={13} className="text-green-400 shrink-0" />
            ) : (
              <Lock size={13} className="text-yellow-400 shrink-0" />
            )}
            <h3 className="font-semibold text-sm text-text-primary truncate">{room.name}</h3>
          </div>
          <Badge variant="accent" className="text-[10px] px-2 py-0">
            {room.subject}
          </Badge>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs shrink-0 px-2 py-1 rounded-full",
            isFull
              ? "bg-red-500/10 text-red-400"
              : room.participant_count > 0
              ? "bg-green-500/10 text-green-400"
              : "bg-bg-elevated text-text-muted"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isFull ? "bg-red-400" : room.participant_count > 0 ? "bg-green-400 animate-pulse" : "bg-text-muted"
            )}
          />
          <Users size={11} />
          <span>{room.participant_count}/{room.max_participants}</span>
        </div>
      </div>

      {room.description && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{room.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Clock size={11} />
          <span>{timeAgo(room.last_activity_at)}</span>
          {room.message_retention === "ephemeral" && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">
              ephemeral
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isFull ? "secondary" : "primary"}
          disabled={isFull}
          onClick={() => onJoin(room.id)}
          className="text-xs h-7 px-3"
        >
          {isFull ? "Full" : "Join"}
        </Button>
      </div>
    </div>
  );
}
