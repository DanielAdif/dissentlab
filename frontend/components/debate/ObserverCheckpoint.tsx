import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensus = Math.round(checkpoint.consensus_score * 100);

  return (
    <div className="border border-border rounded-xl p-4 bg-checkpoint space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Observer — Round {checkpoint.round_number}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-1 bg-accent rounded-full"
              style={{ width: `${consensus}%` }}
            />
          </div>
          <span className="text-xs text-muted">{consensus}%</span>
        </div>
      </div>

      {checkpoint.agreements.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-1">Agreements</div>
          <ul className="space-y-0.5">
            {checkpoint.agreements.map((a, i) => (
              <li key={i} className="text-sm text-foreground/80">· {a}</li>
            ))}
          </ul>
        </div>
      )}

      {checkpoint.disagreements.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-1">Disagreements</div>
          <ul className="space-y-0.5">
            {checkpoint.disagreements.map((d, i) => (
              <li key={i} className="text-sm text-foreground/80">· {d}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted italic">{checkpoint.reason}</p>
    </div>
  );
}
