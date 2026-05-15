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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 chip mb-3 bg-emerald-100 text-emerald-700">
          <Shield size={11} /> Anonymous · End-to-end encrypted
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">Community</h1>
        <p className="text-[14.5px] text-text-secondary mt-2 max-w-xl">
          Connect with GTU students. Real-time chat. Encrypted. Your identity stays anonymous.
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Create Room
        </Button>
        <Button variant="secondary" onClick={() => setShowJoin(true)}>
          <Hash size={14} /> Join by Code
        </Button>
        <Button variant="ghost" onClick={loadRooms} className="ml-auto">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Random match card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[15px] font-semibold text-text-primary flex items-center gap-2">
              <Shuffle size={15} className="text-accent" /> Connect Randomly
            </h3>
            <p className="text-[13px] text-text-muted mt-1">
              Get paired with a student studying the same subject.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!queueId ? (
              <>
                <select
                  value={matchSubject}
                  onChange={(e) => setMatchSubject(e.target.value)}
                  className="input h-10 min-w-[180px]"
                >
                  <option value="">Select subject…</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button
                  variant="primary"
                  onClick={handleRandomMatch}
                  disabled={matchLoading || !matchSubject}
                >
                  {matchLoading ? <Loader2 size={13} className="animate-spin" /> : <Shuffle size={13} />}
                  Match Me
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[13.5px] text-text-secondary">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  Searching… {queueWaitSecs}s
                </div>
                <Button variant="secondary" onClick={handleCancelMatch}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject filter chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => setSelectedSubject(ALL_SUBJECT)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors",
            selectedSubject === ALL_SUBJECT
              ? "bg-accent text-white"
              : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
          )}
        >
          All
        </button>
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors",
              selectedSubject === s
                ? "bg-accent text-white"
                : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Room grid */}
      <div className="pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-40 skeleton" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="card p-16 text-center">
            <Shield size={36} className="text-text-muted/30 mb-4 mx-auto" />
            <p className="text-text-primary text-[14.5px] font-medium">No rooms yet.</p>
            <p className="text-text-muted text-[13px] mt-1">Create one or use Random Match to connect.</p>
            <Button variant="primary" onClick={() => setShowCreate(true)} className="mt-5">
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
