"use client";
import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { useSessionStore } from "@/stores/sessionStore";
import { useSession } from "@/hooks/useSession";
import { MessageCard } from "@/components/debate/MessageCard";
import { ObserverCheckpointCard } from "@/components/debate/ObserverCheckpoint";
import { SourcePanel } from "@/components/debate/SourcePanel";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getPersonaStyle, cn } from "@/lib/utils";

const PERSONAS = [
  { id: "optimist",   name: "Optimist",   symbol: "O" },
  { id: "pessimist",  name: "Pessimist",  symbol: "P" },
  { id: "contrarian", name: "Contrarian", symbol: "C" },
  { id: "observer",   name: "Observer",   symbol: "⚖" },
] as const;

const DEBATERS = ["optimist", "pessimist", "contrarian"] as const;

const PHASE_ORDER = ["researching", "positions", "debating", "completed"];

const PHASE_STEPS = [
  { key: "researching", label: "Research" },
  { key: "positions",   label: "Positions" },
  { key: "debating",    label: "Debate" },
  { key: "completed",   label: "Report" },
] as const;

function toRoman(n: number): string {
  const vals = [10, 9, 5, 4, 1];
  const syms = ["X", "IX", "V", "IV", "I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  return r;
}

function getPersonaStatus(personaId: string, phase: string): string {
  if (phase === "completed" || phase === "final") return "Complete";
  if (phase === "researching") return "Researching";
  if (phase === "positions" || phase === "debating") {
    return personaId === "observer" ? "Observing" : "Debating";
  }
  return "Ready";
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSessionStore();
  const { connect, disconnect, sendStop, connected } = useDebateSocket(id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession(id);

  useEffect(() => {
    store.reset();
    connect();
    return () => disconnect();
  }, [id]);

  useEffect(() => {
    if (session && !store.question) {
      store.setSession(id, session.question);
    }
  }, [session]);

  useEffect(() => {
    if (store.autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [store.messages.length, store.checkpoints.length]);

  useEffect(() => {
    if (store.phase === "completed" && store.finalReport) {
      router.push(`/session/${id}/report`);
    }
  }, [store.phase, store.finalReport]);

  const allRounds = Array.from(
    new Set(store.messages.map((m) => m.round_number))
  ).sort((a, b) => a - b);

  const phase = store.phase;
  const isLive = ["researching", "positions", "debating", "final"].includes(phase);
  const phaseColor =
    phase === "completed" ? "#4E7A5F" : phase === "error" ? "#8B4F4F" : "#B07228";

  const PHASE_LABEL_MAP: Record<string, string> = {
    idle:        "Preparing…",
    researching: "Researching…",
    positions:   "Initial Positions",
    debating:    "Debate in progress",
    final:       "Final synthesis…",
    completed:   "Completed",
    error:       "Error",
  };
  const phaseLabel = PHASE_LABEL_MAP[phase] ?? "Waiting…";

  const curPhaseIdx = PHASE_ORDER.indexOf(phase);
  const phaseSteps = PHASE_STEPS.map((step) => {
    const stepIdx = PHASE_ORDER.indexOf(step.key);
    const done = curPhaseIdx >= stepIdx && curPhaseIdx >= 0;
    const active = phase === step.key || (step.key === "debating" && phase === "final");
    return { ...step, done, active };
  });

  return (
    <div className="flex h-full">
      {/* Left council panel */}
      <aside className="w-[198px] shrink-0 bg-surface border-r border-border flex flex-col overflow-y-auto scrollbar-thin">
        {/* Question */}
        <div className="px-[13px] pt-[14px] pb-3 border-b border-border">
          <p className="text-[9px] text-muted uppercase tracking-[0.12em] mb-1.5">
            The question
          </p>
          <p className="font-serif italic text-[12px] leading-[1.55] text-foreground line-clamp-4">
            {store.question}
          </p>
        </div>

        {/* Phase indicator */}
        <div className="px-[13px] py-[9px] border-b border-border flex items-center gap-[7px]">
          <div
            className={cn("w-[7px] h-[7px] rounded-full shrink-0", isLive && "animate-pulse")}
            style={{ background: phaseColor }}
          />
          <span className="text-[11px] text-muted">{phaseLabel}</span>
        </div>

        {/* Progress steps */}
        <div className="px-[13px] py-2 border-b border-border flex flex-col gap-1">
          {phaseSteps.map((step) => (
            <div key={step.key} className="flex items-center gap-[7px]">
              <div
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ background: step.done ? phaseColor : "#C4BDB5" }}
              />
              <span
                className={cn(
                  "text-[10px]",
                  step.done ? "text-foreground" : "text-muted",
                  step.active && "font-semibold"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Council members */}
        <div className="flex-1 px-[10px] py-3 flex flex-col gap-[5px]">
          <p className="text-[9px] text-muted uppercase tracking-[0.14em] px-[3px] mb-1">
            Council
          </p>
          {PERSONAS.map((persona) => {
            const style = getPersonaStyle(persona.id);
            return (
              <div
                key={persona.id}
                className="rounded-lg px-[10px] py-[9px] flex items-center gap-[9px] border border-transparent"
              >
                <div className="relative w-[30px] h-[30px] shrink-0">
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center border-[1.5px]"
                    style={{ background: style.bg, borderColor: style.color }}
                  >
                    <span
                      className="font-serif text-[13px]"
                      style={{ color: style.color }}
                    >
                      {style.symbol}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[11.5px] font-semibold text-foreground truncate">
                    {style.name}
                  </p>
                  <p className="text-[10px] text-muted mt-px">
                    {getPersonaStatus(persona.id, phase)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="p-[10px] border-t border-border flex flex-col gap-[5px]">
          <button
            onClick={sendStop}
            className="w-full text-[11px] text-muted border border-border rounded-[6px] px-[10px] py-[6px] cursor-pointer text-center bg-transparent hover:text-foreground transition-colors"
          >
            Stop debate
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full text-[11px] text-muted border border-border rounded-[6px] px-[10px] py-[6px] cursor-pointer text-center bg-transparent hover:text-foreground transition-colors"
          >
            ← New question
          </button>
          <button
            onClick={() => store.setAutoScroll(!store.autoScroll)}
            className="w-full text-[11px] text-muted border border-border rounded-[6px] px-[10px] py-[6px] cursor-pointer text-center bg-transparent hover:text-foreground transition-colors"
          >
            {store.autoScroll ? "Pause scroll" : "Resume scroll"}
          </button>
        </div>
      </aside>

      {/* Main debate feed */}
      <main className="flex-1 overflow-y-auto bg-background scrollbar-thin">
        <div className="px-[22px] pt-[22px] pb-[80px]">
          {!connected && (
            <div className="mb-4">
              <ErrorBanner
                message="Connection lost. Attempting to reconnect..."
                onDismiss={() => store.setError("")}
              />
            </div>
          )}
          {store.error && (
            <div className="mb-4">
              <ErrorBanner
                message={store.error}
                onDismiss={() => store.setError("")}
              />
            </div>
          )}

          {/* Researching spinner */}
          {phase === "researching" && (
            <div className="flex flex-col items-center gap-5 py-20 text-center">
              <div
                className="w-[42px] h-[42px] rounded-full border-[2.5px] border-t-transparent animate-spin"
                style={{ borderColor: "#B07228", borderTopColor: "transparent" }}
              />
              <div>
                <p className="font-serif italic text-[16px] text-foreground mb-[5px]">
                  Gathering sources…
                </p>
                <p className="text-[12px] text-muted">
                  The council is researching your question
                </p>
              </div>
            </div>
          )}

          {/* Rounds */}
          {allRounds.map((round) => {
            const roundMessages = store.messages.filter((m) => m.round_number === round);
            const checkpoint = store.checkpoints.find((c) => c.round_number === round);
            const label =
              round === 0 ? "Initial Positions" : `Round ${toRoman(round)}`;

            return (
              <div key={round} className="mb-[30px]">
                {/* Round divider */}
                <div className="flex items-center gap-[14px] mb-[14px]">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] text-muted uppercase tracking-[0.16em] whitespace-nowrap">
                    {label}
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>

                {/* 3-column message grid */}
                <div className="grid grid-cols-3 gap-[10px] items-start">
                  {DEBATERS.map((personaId) => {
                    const msg = roundMessages.find((m) => m.persona_id === personaId);
                    return (
                      <MessageCard
                        key={personaId}
                        message={msg}
                        personaId={personaId}
                      />
                    );
                  })}
                </div>

                {/* Observer checkpoint */}
                {checkpoint && <ObserverCheckpointCard checkpoint={checkpoint} />}
              </div>
            );
          })}

          <SourcePanel />
          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}
