"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Plus, Brain, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useChatStream } from "@/hooks/useChatStream";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatSidebar, type ChatSession } from "@/components/chat/ChatSidebar";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatSource } from "@/hooks/useChatStream";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export default function ChatPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { streaming, streamText, suggestions, error, sendMessage } = useChatStream();

  // Load subjects
  useEffect(() => {
    api.get("/subjects/").then((data: Subject[]) => {
      setSubjects(data);
      if (data.length) setSelectedSubject(data[0]);
    }).catch(() => {});
  }, []);

  // Load sessions when subject changes
  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingSessions(true);
    api.get(`/chat/sessions?subject_id=${selectedSubject.id}`)
      .then((data: ChatSession[]) => {
        setSessions(data);
        setActiveSessionId(data[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, [selectedSubject]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    api.get(`/chat/sessions/${activeSessionId}/messages`)
      .then((data: Message[]) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [activeSessionId]);

  // Scroll to bottom when messages or streaming text changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const handleNewSession = useCallback(async () => {
    if (!selectedSubject) return;
    try {
      const session: ChatSession = await api.post("/chat/sessions", { subject_id: selectedSubject.id });
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch {}
  }, [selectedSubject]);

  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      await api.delete(`/chat/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        setActiveSessionId(remaining[0]?.id ?? null);
      }
    } catch {}
  }, [activeSessionId, sessions]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !activeSessionId || !selectedSubject || streaming) return;

    setInput("");

    // Optimistically add user message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: msg }]);

    await sendMessage(
      activeSessionId,
      selectedSubject.id,
      msg,
      (fullText, finalSources) => {
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, role: "assistant", content: fullText, sources: finalSources },
        ]);
        // Update session title if first message
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId && s.title === "New Chat"
              ? { ...s, title: msg.slice(0, 50) }
              : s
          )
        );
      }
    );
  }, [input, activeSessionId, selectedSubject, streaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const noSession = !activeSessionId;

  return (
    <div className="flex -mx-5 lg:-mx-10 -mt-8 overflow-hidden h-[calc(100svh-116px)] md:h-[calc(100svh-56px)]">
      {/* Session sidebar — hidden on small screens unless toggled */}
      <div className={`${sidebarOpen ? "flex" : "hidden"} md:flex flex-col shrink-0`}>
        <ChatSidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={(id) => setActiveSessionId(id)}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          loading={loadingSessions}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors md:hidden"
          >
            <Brain size={16} />
          </button>
          <Brain size={18} className="text-accent hidden md:block" />
          <span className="font-semibold text-sm text-text-primary">GTU GPT</span>
          <div className="flex-1" />

          {/* Subject picker */}
          <div className="relative">
            <button
              onClick={() => setShowSubjectMenu((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-bg-elevated transition-colors text-text-secondary"
            >
              {selectedSubject?.name ?? "Select Subject"}
              <ChevronDown size={12} />
            </button>
            {showSubjectMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-border glass shadow-menu max-h-64 overflow-y-auto">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSubject(s); setShowSubjectMenu(false); }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-text-muted ml-1">({s.code})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            <Plus size={13} />
            New
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {noSession && !loadingSessions && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Brain size={28} className="text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">GTU GPT</h3>
                <p className="text-sm text-text-secondary max-w-xs">
                  Your AI exam assistant. Ask any GTU question and get marks-aware, structured answers.
                </p>
              </div>
              <button
                onClick={handleNewSession}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Start a chat
              </button>
            </div>
          )}

          {loadingMessages && (
            <div className="text-center text-xs text-text-muted py-8">Loading messages...</div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
          ))}

          {/* Streaming response */}
          {streaming && !streamText && <TypingIndicator />}
          {streaming && streamText && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-1">
                <span className="text-xs font-bold text-accent">G</span>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-text-primary flex-1">
                {streamText}
                <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          )}

          {error && (
            <div className="text-center text-xs text-red-400 py-2">{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {suggestions.length > 0 && !streaming && (
          <SuggestedQuestions questions={suggestions} onSelect={(q) => handleSend(q)} />
        )}

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2 items-end bg-bg-card border border-border rounded-xl px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={noSession ? "Start a chat first..." : "Ask GTU GPT anything..."}
              disabled={noSession || streaming}
              rows={1}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none outline-none min-h-[24px] max-h-[120px] disabled:opacity-50"
              style={{ overflowY: input.split("\n").length > 4 ? "auto" : "hidden" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || noSession || streaming}
              className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="text-xs text-text-muted mt-1.5 text-center">
            GTU GPT uses past papers + your study materials. Verify answers before exams.
          </p>
        </div>
      </div>
    </div>
  );
}
