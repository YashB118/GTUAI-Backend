"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";
import type { ChatSource } from "@/hooks/useChatStream";

interface Props {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export function MessageBubble({ role, content, sources }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-accent text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-1">
        <span className="text-xs font-bold text-accent">G</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm prose-invert max-w-none text-text-primary [&_strong]:text-text-primary [&_code]:bg-bg-card [&_code]:px-1 [&_code]:rounded">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {sources && sources.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-text-muted">Sources:</span>
            {sources.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-card border border-border rounded text-xs text-text-secondary"
              >
                <FileText size={11} className="shrink-0" />
                {s.title}{s.page != null ? ` · p.${s.page}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
