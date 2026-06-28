"use client";
import { useCallback, useRef, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";

type WebSocketEvent = {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

const WS_BASE = typeof window !== "undefined"
  ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
  : "";

export function useDebateSocket(sessionId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const store = useSessionStore();

  const handleEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case "session.started":
        store.setPhase("researching");
        break;
      case "status.update":
        store.setStatusMessage((event.payload.message as string) ?? "");
        if ((event.payload.message as string)?.includes("initial positions")) {
          store.setPhase("positions");
        } else if ((event.payload.message as string)?.includes("Round")) {
          store.setPhase("debating");
        }
        break;
      case "persona.position":
      case "debate.message":
        store.addMessage({
          round_number: (event.payload.round_number as number) ?? 0,
          persona_id: event.payload.persona_id as string,
          persona_name: event.payload.persona_name as string,
          content: event.payload.content as string,
          cited_sources: (event.payload.cited_sources as string[]) ?? [],
          confidence: (event.payload.confidence as string) ?? "Medium",
          created_at: event.timestamp,
        });
        break;
      case "observer.checkpoint":
        store.addCheckpoint({
          round_number: event.payload.round_number as number,
          consensus_score: event.payload.consensus_score as number,
          agreements: (event.payload.agreements as string[]) ?? [],
          disagreements: (event.payload.disagreements as string[]) ?? [],
          should_continue: event.payload.should_continue as boolean,
          reason: event.payload.reason as string,
        });
        break;
      case "source.found":
        store.addSource({
          title: event.payload.title as string,
          url: (event.payload.url as string) ?? "",
          domain: (event.payload.url as string)?.split("/")[2] ?? "",
          summary: "",
          persona_id: event.payload.persona_id as string,
        });
        break;
      case "final_report.done":
        store.setFinalReport(event.payload.content as string);
        break;
      case "error":
        store.setError((event.payload.message as string) ?? "Unknown error");
        break;
      default:
        break;
    }
  }, [store]);

  const connect = useCallback(() => {
    if (!sessionId || ws.current?.readyState === WebSocket.OPEN) return;
    const url = `${WS_BASE}/ws/sessions/${sessionId}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setEverConnected(true);
      reconnectAttempts.current = 0;
    };

    socket.onmessage = (e) => {
      try {
        const event: WebSocketEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch {
        // ignore malformed
      }
    };

    socket.onclose = () => {
      setConnected(false);
      if (reconnectAttempts.current < 3) {
        const delay = Math.pow(2, reconnectAttempts.current) * 1000;
        reconnectAttempts.current += 1;
        setTimeout(() => connect(), delay);
      } else {
        store.setStatusMessage("Connection lost. Reconnect manually.");
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [sessionId, handleEvent, store]);

  const disconnect = useCallback(() => {
    ws.current?.close();
    ws.current = null;
    setConnected(false);
  }, []);

  const sendStop = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "user.stop" }));
    }
  }, []);

  const sendSkipToFinal = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "user.skip_to_final" }));
    }
  }, []);

  return { connect, disconnect, sendStop, sendSkipToFinal, connected, everConnected };
}
