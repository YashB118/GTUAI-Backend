"use client";

import { useState } from "react";
import { X, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface Props {
  onClose: () => void;
  onJoined: (roomId: string) => void;
}

export function JoinRoomModal({ onClose, onJoined }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/community/rooms/join", { room_code: code.trim().toUpperCase() });
      onJoined(res.room_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Room not found or expired");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm glass border border-border/60 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Join by Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Room Code</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3X7KQP"
                className="pl-8 font-mono tracking-wider uppercase"
                maxLength={20}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-text-muted mt-1.5">Ask the room creator for their 8-character code.</p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading || !code.trim()} className="flex-1">
              {loading ? "Joining…" : "Join Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
