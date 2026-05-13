"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, ArrowLeft, Users, AlertTriangle, Shield, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommunitySocket, type CommunityMessage } from "@/hooks/useCommunitySocket";
import { ParticipantList } from "./ParticipantList";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  roomId: string;
  onLeave: () => void;
}

function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center my-1">
      <span className="text-[11px] italic text-text-muted bg-bg-elevated/60 px-3 py-0.5 rounded-full">
        {text}
      </span>
    </div>
  );
}

function MessageBubble({ msg, isMe }: { msg: CommunityMessage; isMe: boolean }) {
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("flex gap-2.5 group", isMe ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5",
          isMe ? "bg-accent/20 text-accent" : "bg-bg-elevated text-text-secondary"
        )}
      >
        {msg.pseudonym.slice(0, 2).toUpperCase()}
      </span>
      <div className={cn("flex flex-col gap-0.5 max-w-[72%]", isMe ? "items-end" : "items-start")}>
        <span className="text-[11px] text-text-muted px-1">{isMe ? "You" : msg.pseudonym}</span>
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
            isMe
              ? "bg-accent text-white rounded-tr-sm"
              : "bg-bg-elevated text-text-primary rounded-tl-sm"
          )}
        >
          {msg.text}
        </div>
        <div className={cn("flex items-center gap-1 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[10px] text-text-muted">{time}</span>
          {isMe && (
            <span className="text-[10px] text-text-muted">
              {msg.status === "sending" ? "•" : msg.status === "sent" ? "✓✓" : "!"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ users }: { users: string[] }) {
  if (!users.length) return null;
  const label = users.length === 1 ? `${users[0]} is typing…` : `${users.length} people are typing…`;
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted italic">{label}</span>
    </div>
  );
}

function ConnectionBadge({ state }: { state: string }) {
  const config: Record<string, { dot: string; text: string }> = {
    connected: { dot: "bg-green-400 animate-pulse", text: "Connected" },
    connecting: { dot: "bg-yellow-400 animate-pulse", text: "Connecting…" },
    reconnecting: { dot: "bg-yellow-400 animate-pulse", text: "Reconnecting…" },
    error: { dot: "bg-red-400", text: "Disconnected" },
    idle: { dot: "bg-text-muted", text: "Idle" },
  };
  const c = config[state] || config.idle;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      <span className="text-[11px] text-text-muted">{c.text}</span>
    </div>
  );
}

export function CommunityChat({ roomId, onLeave }: Props) {
  const [showParticipants, setShowParticipants] = useState(true);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, participants, myPseudonym, room, connectionState, typingUsers,
    sendMessage, sendTypingStart, sendTypingStop } = useCommunitySocket({
    roomId,
    onError: (msg) => toast.error(msg),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    sendTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(sendTypingStop, 2000);
  }, [sendTypingStart, sendTypingStop]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTypingStop();
    await sendMessage(text);
  }, [input, sendMessage, sendTypingStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const copyCode = useCallback(() => {
    if (!room?.room_code) return;
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room?.room_code]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
        <Button variant="ghost" size="sm" onClick={onLeave} className="p-1.5 h-auto" type="button">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-text-primary truncate">{room?.name || "…"}</h2>
            {room?.subject && (
              <span className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent rounded-full shrink-0">
                {room.subject}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <ConnectionBadge state={connectionState} />
            <span className="text-[11px] text-text-muted">
              <Shield size={10} className="inline mr-0.5 text-green-400" />
              End-to-end encrypted
            </span>
          </div>
        </div>
        {room?.room_code && (
          <button
            onClick={copyCode}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-border/30 transition-colors text-xs text-text-muted font-mono"
            title="Copy room code"
          >
            <span>{room.room_code}</span>
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
        )}
        <button
          onClick={() => setShowParticipants((p) => !p)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showParticipants ? "bg-accent/15 text-accent" : "hover:bg-bg-elevated text-text-muted"
          )}
        >
          <Users size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {connectionState === "error" && (
            <div className="flex items-center gap-2 mx-4 my-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <AlertTriangle size={13} />
              Connection lost. Attempting to reconnect…
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && connectionState === "connected" && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Shield size={32} className="text-accent/40 mb-3" />
                <p className="text-text-muted text-sm">Messages are end-to-end encrypted.</p>
                <p className="text-text-muted text-xs mt-1">Your identity stays anonymous.</p>
              </div>
            )}
            {messages.map((msg) =>
              msg.isSystem ? (
                <SystemMessage key={msg.id} text={msg.text} />
              ) : (
                <MessageBubble key={msg.id} msg={msg} isMe={msg.isMine} />
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          <TypingIndicator users={typingUsers} />

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-border/40">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (encrypted before sending)"
                rows={1}
                className="flex-1 resize-none bg-bg-elevated border border-border/50 rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors max-h-32 overflow-y-auto"
                style={{ minHeight: "42px" }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || connectionState !== "connected"}
                size="sm"
                className="shrink-0 h-10 w-10 p-0"
              >
                <Send size={15} />
              </Button>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 px-1">
              You are <span className="text-accent font-medium">{myPseudonym || "…"}</span> · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Participant sidebar */}
        {showParticipants && (
          <div className="hidden md:flex">
            <ParticipantList
              participants={participants}
              myPseudonym={myPseudonym}
              typingUsers={typingUsers}
            />
          </div>
        )}
      </div>
    </div>
  );
}
