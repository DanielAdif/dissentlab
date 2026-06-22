import { create } from "zustand";
import type { DebateMessage, ObserverCheckpoint } from "@/lib/api";

type Phase = "idle" | "researching" | "positions" | "debating" | "final" | "completed" | "error";

type SessionState = {
  sessionId: string | null;
  question: string;
  phase: Phase;
  messages: DebateMessage[];
  checkpoints: ObserverCheckpoint[];
  sources: unknown[];
  finalReport: string | null;
  statusMessage: string;
  error: string | null;
  autoScroll: boolean;

  setSession: (id: string, question: string) => void;
  setPhase: (phase: Phase) => void;
  addMessage: (msg: DebateMessage) => void;
  addCheckpoint: (cp: ObserverCheckpoint) => void;
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
  setFinalReport: (report) => set({ finalReport: report, phase: "completed" }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setError: (error) => set({ error, phase: "error" }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  reset: () => set(initialState),
}));
