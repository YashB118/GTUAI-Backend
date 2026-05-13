"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Hash, Shuffle, Shield, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoomCard } from "@/components/community/RoomCard";
import { CreateRoomModal } from "@/components/community/CreateRoomModal";
import { JoinRoomModal } from "@/components/community/JoinRoomModal";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  subject: string;
  description?: string;
  is_public: boolean;
  participant_count: number;
  max_participants: number;
  last_activity_at: string;
  message_retention: string;
}

const ALL_SUBJECT = "__all__";
const POLL_INTERVAL = 5000; // 5s

export default function CommunityPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(ALL_SUBJECT);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [matchSubject, setMatchSubject] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [queueWaitSecs, setQueueWaitSecs] = useState(0);

  const loadRooms = useCallback(async () => {
    try {
      const data = await api.get(
        `/community/rooms${selectedSubject !== ALL_SUBJECT ? `?subject=${encodeURIComponent(selectedSubject)}` : ""}`
      );
      setRooms(data);
    } catch {
      /* silent refresh failure */
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    api.get("/community/subjects").then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    loadRooms();
    const timer = setInterval(loadRooms, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadRooms]);

  // Poll match queue
  useEffect(() => {
    if (!queueId) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/community/match-status/${queueId}`);
        if (res.status === "waiting") {
          setQueueWaitSecs(res.wait_seconds);
        } else {
          // Expired / cleared externally
          setQueueId(null);
          setMatchLoading(false);
          toast.error("Match queue expired. Try again.");
        }
      } catch {
        setQueueId(null);
        setMatchLoading(false);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [queueId]);

  async function handleRandomMatch() {
    if (!matchSubject) { toast.error("Select a subject first"); return; }
    setMatchLoading(true);
    try {
      const res = await api.post("/community/random-match", { subject: matchSubject });
      if (res.status === "matched") {
        toast.success("Matched! Joining room…");
        router.push(`/community/room/${res.room_id}`);
      } else {
        setQueueId(res.queue_id);
        toast.info("Waiting for a match…");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Match failed");
      setMatchLoading(false);
    }
  }

  async function handleCancelMatch() {
    try {
      await api.delete("/community/match-queue");
    } catch {}
    setQueueId(null);
    setMatchLoading(false);
    toast.info("Left match queue");
  }

  function handleJoinRoom(roomId: string) {
    router.push(`/community/room/${roomId}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-bg-elevated/30 to-transparent px-6 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--accent)/6%,_transparent_60%)]" />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-green-400" />
            <span className="text-xs text-green-400 font-medium">Anonymous · Encrypted · Private</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Community</h1>
          <p className="text-sm text-text-muted">
            Connect with students across semesters. All messages are end-to-end encrypted.
            Your identity stays anonymous.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Actions bar */}
        <div className="px-6 py-4 flex flex-wrap gap-3 border-b border-border/30">
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus size={14} /> Create Room
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)} className="flex items-center gap-2">
            <Hash size={14} /> Join by Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRooms}
            className="ml-auto flex items-center gap-1.5 text-text-muted"
          >
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>

        {/* Random match */}
        <div className="mx-6 mt-5 p-4 glass border border-border/40 rounded-2xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                <Shuffle size={15} className="text-accent" /> Connect Randomly
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Get paired with a student studying the same subject.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!queueId ? (
                <>
                  <select
                    value={matchSubject}
                    onChange={(e) => setMatchSubject(e.target.value)}
                    className="bg-bg-elevated border border-border/60 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 min-w-[160px]"
                  >
                    <option value="">Select subject…</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRandomMatch}
                    disabled={matchLoading || !matchSubject}
                    className="flex items-center gap-1.5"
                  >
                    {matchLoading ? <Loader2 size={13} className="animate-spin" /> : <Shuffle size={13} />}
                    Match Me
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    Searching… {queueWaitSecs}s
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleCancelMatch}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subject filters */}
        <div className="px-6 mt-5 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSubject(ALL_SUBJECT)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              selectedSubject === ALL_SUBJECT
                ? "bg-accent text-white"
                : "bg-bg-elevated text-text-muted hover:text-text-primary"
            )}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedSubject === s
                  ? "bg-accent text-white"
                  : "bg-bg-elevated text-text-muted hover:text-text-primary"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Room grid */}
        <div className="px-6 mt-5 pb-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 glass border border-border/30 rounded-2xl animate-pulse"
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield size={40} className="text-accent/30 mb-4" />
              <p className="text-text-muted text-sm">No rooms yet.</p>
              <p className="text-text-muted text-xs mt-1">Create one or use Random Match to connect.</p>
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} className="mt-4">
                Create First Room
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(room) => {
            setShowCreate(false);
            router.push(`/community/room/${room.id}`);
          }}
        />
      )}
      {showJoin && (
        <JoinRoomModal
          onClose={() => setShowJoin(false)}
          onJoined={(roomId) => {
            setShowJoin(false);
            router.push(`/community/room/${roomId}`);
          }}
        />
      )}
    </div>
  );
}
