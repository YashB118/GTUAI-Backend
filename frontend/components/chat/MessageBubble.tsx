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
        <div className="bg-accent text-white rounded-3xl rounded-br-md px-4 py-2.5 max-w-[78%] text-[14px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-1">
        <span className="text-[11px] font-bold text-accent">G</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none text-text-primary
          [&_strong]:text-text-primary [&_code]:bg-bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[12.5px]
          [&_pre]:bg-bg-muted [&_pre]:rounded-xl [&_pre]:p-3
          [&_a]:text-accent [&_a]:no-underline hover:[&_a]:underline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {sources && sources.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <span className="text-[11px] text-text-muted">Sources:</span>
            {sources.map((s, i) => (
              <span
                key={i}
                className="chip text-[11px]"
              >
                <FileText size={10} className="shrink-0" />
                {s.title}{s.page != null ? ` · p.${s.page}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
