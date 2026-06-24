"use client";
import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { useSessionStore } from "@/stores/sessionStore";
import { useSession } from "@/hooks/useSession";
import { PhaseIndicator } from "@/components/debate/PhaseIndicator";
import { MessageCard } from "@/components/debate/MessageCard";
import { ObserverCheckpointCard } from "@/components/debate/ObserverCheckpoint";
import { SourcePanel } from "@/components/debate/SourcePanel";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { RoundSection } from "@/components/debate/RoundSection";

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

  const currentRound = store.messages
    .filter((m) => m.round_number > 0)
    .reduce((max, m) => Math.max(max, m.round_number), 0);

  const allRounds = Array.from(
    new Set(store.messages.map((m) => m.round_number))
  ).sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-sidebar border-b border-border px-4 py-3 flex items-center gap-4 shrink-0">
        <p className="text-sm text-foreground flex-1 truncate">{store.question}</p>
        <PhaseIndicator phase={store.phase} round={currentRound} />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => store.setAutoScroll(!store.autoScroll)}
            className="text-xs text-muted border border-border rounded px-2 py-1 hover:border-foreground/30 transition-colors"
          >
            {store.autoScroll ? "Pause scroll" : "Resume scroll"}
          </button>
          <button
            onClick={sendStop}
            className="text-xs text-muted border border-border rounded px-2 py-1 hover:border-foreground/30 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {!connected && (
            <ErrorBanner
              message="Connection lost. Attempting to reconnect..."
              onDismiss={() => store.setError("")}
            />
          )}
          {store.error && (
            <ErrorBanner
              message={store.error}
              onDismiss={() => store.setError("")}
            />
          )}
          {allRounds.map((round) => {
            const roundMessages = store.messages.filter((m) => m.round_number === round);
            const checkpoint = store.checkpoints.find((c) => c.round_number === round);
            const label = round === 0 ? "Initial Positions" : `Round ${round}`;
            return (
              <RoundSection key={round} label={label}>
                {roundMessages.map((msg, i) => (
                  <MessageCard key={`${msg.persona_id}-${i}`} message={msg} />
                ))}
                {checkpoint && <ObserverCheckpointCard checkpoint={checkpoint} />}
              </RoundSection>
            );
          })}
          <SourcePanel />
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
