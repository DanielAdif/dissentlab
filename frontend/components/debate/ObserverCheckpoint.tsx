import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensus = Math.round(checkpoint.consensus_score * 100);
  return (
    <div className="border border-observer/30 rounded-md p-4 bg-observer/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-observer uppercase tracking-wider">
          Observer — Round {checkpoint.round_number}
        </span>
        <span className="text-xs text-muted">Consensus: {consensus}%</span>
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
              <li key={i} className="text-sm text-pessimist/80">· {d}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted italic">{checkpoint.reason}</p>
    </div>
  );
}
