"use client";

import { useState } from "react";
import { X, Lock, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "Data Structures", "DBMS", "Operating Systems", "Mathematics",
  "Machine Learning", "Computer Networks", "Software Engineering",
  "Web Development", "Algorithms", "Object-Oriented Programming",
  "Theory of Computation", "Compiler Design", "Computer Architecture",
  "Digital Electronics", "Microprocessors",
];

interface Props {
  onClose: () => void;
  onCreated: (room: { id: string; room_code: string }) => void;
}

export function CreateRoomModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxPart, setMaxPart] = useState(50);
  const [expiresHours, setExpiresHours] = useState<number | "">("");
  const [retention, setRetention] = useState("ephemeral");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject) { setError("Name and subject required"); return; }
    setLoading(true);
    setError("");
    try {
      const room = await api.post("/community/rooms", {
        name: name.trim(),
        subject,
        description: description.trim() || null,
        is_public: isPublic,
        max_participants: maxPart,
        expires_in_hours: expiresHours || null,
        message_retention: retention,
      });
      onCreated(room);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass border border-border/60 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Create Room</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Room Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DSA Doubt Session"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-bg-elevated border border-border/60 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value="">Select subject</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you discuss?"
              maxLength={500}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">Visibility</label>
            <div className="flex gap-2">
              {[
                { val: true, label: "Public", icon: Globe, desc: "Listed for all" },
                { val: false, label: "Private", icon: Lock, desc: "Code required" },
              ].map(({ val, label, icon: Icon, desc }) => (
                <button
                  type="button"
                  key={String(val)}
                  onClick={() => setIsPublic(val)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors text-sm",
                    isPublic === val
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-border/40 text-text-muted hover:border-border/70"
                  )}
                >
                  <Icon size={16} />
                  <span className="font-medium">{label}</span>
                  <span className="text-[10px] opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message retention */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">Message Retention</label>
            <div className="flex gap-2">
              {[
                { val: "ephemeral", label: "Ephemeral", desc: "Gone on disconnect" },
                { val: "timed", label: "Timed", desc: "Stored, limited" },
                { val: "permanent", label: "Permanent", desc: "Always stored" },
              ].map(({ val, label, desc }) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setRetention(val)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-xs transition-colors",
                    retention === val
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-border/40 text-text-muted hover:border-border/70"
                  )}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-[10px] opacity-60">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1 block">
                <Clock size={11} /> Expires in (hours, optional)
              </label>
              <Input
                type="number"
                min={1}
                max={168}
                value={expiresHours}
                onChange={(e) => setExpiresHours(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 24"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1.5 block">Max Participants</label>
              <Input
                type="number"
                min={2}
                max={100}
                value={maxPart}
                onChange={(e) => setMaxPart(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading} className="flex-1">
              {loading ? "Creating…" : "Create Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
