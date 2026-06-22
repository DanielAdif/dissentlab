type Phase = "idle" | "researching" | "positions" | "debating" | "final" | "completed" | "error";

const PHASES: { key: Phase; label: string }[] = [
  { key: "researching", label: "Researching" },
  { key: "positions", label: "Initial Positions" },
  { key: "debating", label: "Debate" },
  { key: "completed", label: "Final Report" },
];

export function PhaseIndicator({ phase, round }: { phase: Phase; round: number }) {
  const activeIndex = PHASES.findIndex((p) => p.key === phase);
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      {PHASES.map((p, i) => (
        <span key={p.key} className="flex items-center gap-2">
          <span className={i <= activeIndex ? "text-accent font-medium" : ""}>
            {p.key === "debating" && round > 0 ? `Round ${round}` : p.label}
          </span>
          {i < PHASES.length - 1 && <span className="text-border">→</span>}
        </span>
      ))}
    </div>
  );
}
