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
    <div className="card card-hover p-5 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {room.is_public ? (
              <Globe size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <Lock size={12} className="text-amber-500 shrink-0" />
            )}
            <h3 className="font-semibold text-[15px] text-text-primary truncate tracking-tight">{room.name}</h3>
          </div>
          <Badge variant="accent">{room.subject}</Badge>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11.5px] font-medium shrink-0 px-2.5 py-1 rounded-full",
            isFull
              ? "bg-red-100 text-red-700"
              : room.participant_count > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-bg-muted text-text-muted"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isFull ? "bg-red-500" : room.participant_count > 0 ? "bg-emerald-500 animate-pulse" : "bg-text-muted"
            )}
          />
          <Users size={11} />
          <span>{room.participant_count}/{room.max_participants}</span>
        </div>
      </div>

      {room.description && (
        <p className="text-[13px] text-text-secondary leading-relaxed line-clamp-2">{room.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
          <Clock size={11} />
          <span>{timeAgo(room.last_activity_at)}</span>
          {room.message_retention === "ephemeral" && (
            <span className="ml-1 chip text-[10px] bg-violet-100 text-violet-700">ephemeral</span>
          )}
        </div>
        <Button
          size="sm"
          variant={isFull ? "secondary" : "primary"}
          disabled={isFull}
          onClick={() => onJoin(room.id)}
        >
          {isFull ? "Full" : "Join"}
        </Button>
      </div>
    </div>
  );
}
