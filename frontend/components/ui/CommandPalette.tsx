"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Sparkles, MessageSquare, BookOpen,
  FileQuestion, Upload, Command, ArrowRight, Brain,
} from "lucide-react";
import { api } from "@/lib/api";

interface Subject { id: string; name: string; code: string; branch: string; semester: number; }

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

const NAV_ITEMS: Omit<PaletteItem, "action">[] = [
  { id: "dashboard",     label: "Dashboard",      icon: <LayoutDashboard size={14} />, category: "Navigate" },
  { id: "predict",       label: "Predict Exam",   icon: <Sparkles size={14} />,        category: "Navigate" },
  { id: "chat",          label: "GTU GPT Chat",   icon: <MessageSquare size={14} />,   category: "Navigate" },
  { id: "materials",     label: "Study Materials",icon: <BookOpen size={14} />,        category: "Navigate" },
  { id: "question-bank", label: "Question Bank",  icon: <FileQuestion size={14} />,    category: "Navigate" },
  { id: "my-uploads",    label: "My Uploads",     icon: <Upload size={14} />,          category: "Navigate" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      api.get("/subjects").then((d: Subject[]) => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const go = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const allItems: PaletteItem[] = [
    ...NAV_ITEMS.map(n => ({ ...n, action: () => go(`/${n.id}`) })),
    ...subjects
      .filter(s =>
        !query ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.code.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 6)
      .map(s => ({
        id: `subject-${s.id}`,
        label: s.name,
        sublabel: [s.code, s.branch, `Sem ${s.semester}`].filter(Boolean).join(" · "),
        icon: <Brain size={14} />,
        category: "Subjects → Predict",
        action: () => {
          router.push(`/predict?subject=${s.id}`);
          onClose();
        },
      })),
  ];

  const filtered = query
    ? allItems.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.sublabel?.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[activeIdx]) {
        filtered[activeIdx].action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIdx, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  // Group items
  const groups: Record<string, PaletteItem[]> = {};
  for (const item of filtered) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }

  let globalIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-modal border border-border animate-scale-in"
        style={{ background: "rgb(var(--c-bg-card))" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Command size={15} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, subjects, actions..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5 font-mono">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          )}

          {Object.entries(groups).map(([category, items]) => (
            <div key={category}>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                {category}
              </p>
              {items.map(item => {
                globalIdx++;
                const idx = globalIdx;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      activeIdx === idx ? "bg-accent/10" : "hover:bg-bg-elevated"
                    }`}
                  >
                    <span className={`shrink-0 ${activeIdx === idx ? "text-accent" : "text-text-muted"}`}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${activeIdx === idx ? "text-accent" : "text-text-primary"}`}>
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <p className="text-[11px] text-text-muted truncate">{item.sublabel}</p>
                      )}
                    </div>
                    {activeIdx === idx && <ArrowRight size={12} className="text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-[11px] text-text-muted">
          <span><kbd className="font-mono border border-border rounded px-1 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono border border-border rounded px-1 py-0.5">↵</kbd> open</span>
          <span><kbd className="font-mono border border-border rounded px-1 py-0.5">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
