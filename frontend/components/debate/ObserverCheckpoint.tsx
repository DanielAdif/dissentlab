import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensus = Math.round(checkpoint.consensus_score * 100);

  return (
    <div className="bg-surface rounded-lg px-5 py-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          Observer — Round {checkpoint.round_number}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-[2px] bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-muted rounded-full"
              style={{ width: `${consensus}%` }}
            />
          </div>
          <span className="text-[11px] text-muted">{consensus}%</span>
        </div>
      </div>

      {checkpoint.agreements.length > 0 && (
        <div>
          <div className="text-[11px] text-muted mb-1">Agreements</div>
          <ul className="space-y-0.5">
            {checkpoint.agreements.map((a, i) => (
              <li key={i} className="text-[14px] text-foreground/80">
                · {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkpoint.disagreements.length > 0 && (
        <div>
          <div className="text-[11px] text-muted mb-1">Disagreements</div>
          <ul className="space-y-0.5">
            {checkpoint.disagreements.map((d, i) => (
              <li key={i} className="text-[14px] text-foreground/80">
                · {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted italic">{checkpoint.reason}</p>
    </div>
  );
}
