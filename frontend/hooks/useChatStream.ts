"use client";

import { useState } from "react";
import { getToken } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface ChatSource {
  title: string;
  page?: number;
  material_id?: string;
}

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (
    sessionId: string,
    subjectId: string,
    message: string,
    onDone?: (fullText: string, sources: ChatSource[]) => void
  ) => {
    setStreaming(true);
    setStreamText("");
    setSources([]);
    setSuggestions([]);
    setError(null);

    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, subject_id: subjectId, message }),
      });
    } catch (e) {
      setError("Network error. Check your connection.");
      setStreaming(false);
      return;
    }

    if (!res.ok || !res.body) {
      setError("Failed to get response from GTU GPT.");
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    let finalSources: ChatSource[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.token) {
            accumulated += payload.token;
            setStreamText(accumulated);
          }
          if (payload.sources) {
            finalSources = payload.sources;
            setSources(payload.sources);
          }
          if (payload.suggestions) {
            setSuggestions(payload.suggestions);
          }
          if (payload.error) {
            setError(payload.error);
          }
          if (payload.done) {
            setStreaming(false);
            onDone?.(accumulated, finalSources);
          }
        } catch {}
      }
    }
    setStreaming(false);
  };

  return { streaming, streamText, sources, suggestions, error, sendMessage };
}
