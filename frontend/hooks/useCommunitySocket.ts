"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/api";
import { deriveRoomKey, encryptMessage, decryptMessage } from "@/lib/crypto";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const WS_BASE = BACKEND_URL.replace(/^https?:\/\//, (m) =>
  m.startsWith("https") ? "wss://" : "ws://"
);

export interface CommunityMessage {
  id: string;
  tempId?: string;
  pseudonym: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  status: "sending" | "sent" | "failed";
  isSystem?: boolean;
}

export interface Participant {
  pseudonym: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  subject: string;
  room_code: string;
  message_retention: string;
  is_public: boolean;
}

type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "error";

interface UseSocketOptions {
  roomId: string;
  onError?: (msg: string) => void;
}

function sysMsg(text: string): CommunityMessage {
  return {
    id: `sys-${Date.now()}-${Math.random()}`,
    pseudonym: "system",
    text,
    timestamp: new Date().toISOString(),
    isMine: false,
    status: "sent",
    isSystem: true,
  };
}

export function useCommunitySocket({ roomId, onError }: UseSocketOptions) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myPseudonym, setMyPseudonym] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const myPseudonymRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const isConnectingRef = useRef(false);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTypingTimer = useCallback((pseudonym: string) => {
    const t = typingTimersRef.current.get(pseudonym);
    if (t) clearTimeout(t);
    typingTimersRef.current.delete(pseudonym);
  }, []);

  const handleTypingStart = useCallback((pseudonym: string) => {
    setTypingUsers((prev) => new Set(prev).add(pseudonym));
    clearTypingTimer(pseudonym);
    const t = setTimeout(() => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(pseudonym);
        return next;
      });
    }, 4000);
    typingTimersRef.current.set(pseudonym, t);
  }, [clearTypingTimer]);

  const handleTypingStop = useCallback((pseudonym: string) => {
    clearTypingTimer(pseudonym);
    setTypingUsers((prev) => {
      const next = new Set(prev);
      next.delete(pseudonym);
      return next;
    });
  }, [clearTypingTimer]);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    // Prevent overlapping connect calls (rapid navigation / reconnect races)
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    setConnectionState(retryCountRef.current > 0 ? "reconnecting" : "connecting");

    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      // ignore
    }

    if (!token) {
      isConnectingRef.current = false;
      setConnectionState("error");
      onError?.("Not authenticated");
      return;
    }

    const url = `${WS_BASE}/community/ws/${roomId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectingRef.current = false;
      retryCountRef.current = 0;
      setConnectionState("connected");
    };

    ws.onmessage = async (event) => {
      if (!mountedRef.current) return;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const type = data.type as string;

      if (type === "room_state") {
        const roomData = data.room as RoomInfo;
        setRoom(roomData);
        const myPs = data.my_pseudonym as string;
        setMyPseudonym(myPs);
        myPseudonymRef.current = myPs;
        setParticipants((data.participants as Participant[]) || []);

        try {
          const key = await deriveRoomKey(roomData.room_code);
          keyRef.current = key;

          const history = (data.messages as Array<Record<string, string>>) || [];
          const decrypted = await Promise.all(
            history.map(async (m) => {
              let text = "[encrypted]";
              try {
                text = await decryptMessage(key, m.ciphertext, m.iv);
              } catch {}
              return {
                id: m.id,
                pseudonym: m.sender_pseudonym,
                text,
                timestamp: m.created_at,
                isMine: m.sender_pseudonym === myPs,
                status: "sent" as const,
              };
            })
          );
          setMessages(decrypted);
        } catch (e) {
          console.error("Key derivation failed", e);
        }
      }

      else if (type === "message") {
        if (!keyRef.current) return;
        let text = "[encrypted]";
        try {
          text = await decryptMessage(
            keyRef.current,
            data.ciphertext as string,
            data.iv as string
          );
        } catch {}
        const incoming: CommunityMessage = {
          id: data.id as string,
          pseudonym: data.pseudonym as string,
          text,
          timestamp: data.timestamp as string,
          isMine: data.pseudonym === myPseudonymRef.current,
          status: "sent",
        };
        setMessages((prev) => [...prev, incoming]);
        handleTypingStop(data.pseudonym as string);
      }

      else if (type === "message_ack") {
        const tempId = data.temp_id as string;
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId
              ? { ...m, id: data.id as string, status: "sent", timestamp: data.timestamp as string }
              : m
          )
        );
      }

      else if (type === "user_joined") {
        const p = data.pseudonym as string;
        setParticipants((prev) =>
          prev.some((x) => x.pseudonym === p) ? prev : [...prev, { pseudonym: p }]
        );
        setMessages((prev) => [...prev, sysMsg(`${p} joined the room`)]);
      }

      else if (type === "user_left") {
        const p = data.pseudonym as string;
        setParticipants((prev) => prev.filter((x) => x.pseudonym !== p));
        handleTypingStop(p);
        setMessages((prev) => [...prev, sysMsg(`${p} left the room`)]);
      }

      else if (type === "typing_start") {
        handleTypingStart(data.pseudonym as string);
      }

      else if (type === "typing_stop") {
        handleTypingStop(data.pseudonym as string);
      }

      else if (type === "presence_update") {
        setParticipants((data.participants as Participant[]) || []);
      }

      else if (type === "error") {
        onError?.(data.message as string);
      }
    };

    ws.onclose = (e) => {
      isConnectingRef.current = false;
      if (!mountedRef.current) return;
      wsRef.current = null;
      keyRef.current = null;
      if (e.code === 4001 || e.code === 4003 || e.code === 4004) {
        setConnectionState("error");
        onError?.(e.reason || "Connection refused");
        return;
      }
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
      retryCountRef.current += 1;
      setConnectionState("reconnecting");
      retryTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomId, onError, handleTypingStart, handleTypingStop]);

  useEffect(() => {
    mountedRef.current = true;
    isConnectingRef.current = false;
    retryCountRef.current = 0;
    connect();
    const timers = typingTimersRef.current;
    return () => {
      mountedRef.current = false;
      isConnectingRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      timers.forEach((t) => clearTimeout(t));
      wsRef.current?.close(1000);
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onError?.("Not connected");
      return;
    }
    if (!keyRef.current) {
      onError?.("Encryption key not ready");
      return;
    }
    const tempId = crypto.randomUUID();
    const optimistic: CommunityMessage = {
      id: tempId,
      tempId,
      pseudonym: myPseudonymRef.current || "Me",
      text,
      timestamp: new Date().toISOString(),
      isMine: true,
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { ciphertext, iv } = await encryptMessage(keyRef.current, text);
      wsRef.current.send(JSON.stringify({ type: "send_message", temp_id: tempId, ciphertext, iv }));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...m, status: "failed" } : m))
      );
    }
  }, [onError]);

  const sendTypingStart = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "typing_start" }));
  }, []);

  const sendTypingStop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "typing_stop" }));
  }, []);

  const refreshPresence = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "presence_ping" }));
  }, []);

  return {
    messages,
    participants,
    myPseudonym,
    room,
    connectionState,
    typingUsers: Array.from(typingUsers).filter((p) => p !== myPseudonymRef.current),
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    refreshPresence,
  };
}
