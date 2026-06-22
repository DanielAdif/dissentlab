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

  const allRounds = Array.from(new Set(store.messages.map((m) => m.round_number))).sort((a, b) => a - b);

  return (
    <main className="min-h-screen flex flex-col max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <PhaseIndicator phase={store.phase} round={currentRound} />
          {store.statusMessage && (
            <p className="text-xs text-muted">{store.statusMessage}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => store.setAutoScroll(!store.autoScroll)}
            className="text-xs text-muted border border-border rounded px-2 py-1 hover:border-foreground/30"
          >
            {store.autoScroll ? "Pause scroll" : "Resume scroll"}
          </button>
          <button
            onClick={sendStop}
            className="text-xs text-pessimist border border-pessimist/40 rounded px-2 py-1 hover:bg-pessimist/10"
          >
            Stop
          </button>
        </div>
      </div>

      {store.question && (
        <div className="border-b border-border pb-4">
          <p className="text-sm text-muted">Question</p>
          <p className="text-base text-foreground mt-1">{store.question}</p>
        </div>
      )}

      <div className="space-y-4">
        {allRounds.map((round) => {
          const roundMessages = store.messages.filter((m) => m.round_number === round);
          const checkpoint = store.checkpoints.find((c) => c.round_number === round);
          return (
            <div key={round} className="space-y-3">
              {round === 0 && (
                <div className="text-xs text-muted uppercase tracking-wider">Initial Positions</div>
              )}
              {round > 0 && (
                <div className="text-xs text-muted uppercase tracking-wider">Round {round}</div>
              )}
              <div className="space-y-3">
                {roundMessages.map((msg, i) => (
                  <MessageCard key={`${msg.persona_id}-${i}`} message={msg} />
                ))}
              </div>
              {checkpoint && <ObserverCheckpointCard checkpoint={checkpoint} />}
            </div>
          );
        })}

        {store.phase === "error" && store.error && (
          <div className="border border-pessimist/40 rounded-md p-4 text-pessimist text-sm">
            {store.error}
          </div>
        )}

        <SourcePanel />

        <div ref={bottomRef} />
      </div>
    </main>
  );
}
