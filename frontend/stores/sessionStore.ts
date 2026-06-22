import { create } from "zustand";
import type { DebateMessage, ObserverCheckpoint } from "@/lib/api";

type Phase = "idle" | "researching" | "positions" | "debating" | "final" | "completed" | "error";

export type Source = {
  id?: string;
  title: string;
  url: string;
  domain: string;
  summary: string;
  persona_id: string;
};

type SessionState = {
  sessionId: string | null;
  question: string;
  phase: Phase;
  messages: DebateMessage[];
  checkpoints: ObserverCheckpoint[];
  sources: Source[];
  finalReport: string | null;
  statusMessage: string;
  error: string | null;
  autoScroll: boolean;

  setSession: (id: string, question: string) => void;
  setPhase: (phase: Phase) => void;
  addMessage: (msg: DebateMessage) => void;
  addCheckpoint: (cp: ObserverCheckpoint) => void;
  addSource: (src: Omit<Source, "id">) => void;
  setFinalReport: (report: string) => void;
  setStatusMessage: (msg: string) => void;
  setError: (err: string) => void;
  setAutoScroll: (v: boolean) => void;
  reset: () => void;
};

const initialState = {
  sessionId: null,
  question: "",
  phase: "idle" as Phase,
  messages: [],
  checkpoints: [],
  sources: [],
  finalReport: null,
  statusMessage: "",
  error: null,
  autoScroll: true,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setSession: (id, question) => set({ sessionId: id, question, phase: "idle" }),
  setPhase: (phase) => set({ phase }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  addCheckpoint: (cp) => set((s) => ({ checkpoints: [...s.checkpoints, cp] })),
  addSource: (src) => set((s) => ({ sources: [...s.sources, src] })),
  setFinalReport: (report) => set({ finalReport: report, phase: "completed" }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setError: (error) => set({ error: error || null, phase: error ? "error" : "idle" }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  reset: () => set(initialState),
}));
