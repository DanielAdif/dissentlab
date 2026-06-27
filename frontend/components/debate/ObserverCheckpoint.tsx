import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensusScore = Math.round(checkpoint.consensus_score * 100);
  const afterLabel =
    checkpoint.round_number === 0
      ? "After Initial Positions"
      : `After Round ${checkpoint.round_number}`;

  return (
    <div
      className="mt-3 rounded-[10px] px-5 py-[18px] border border-l-4 animate-verdict-in"
      style={{
        background: "#F5EDE2",
        borderColor: "#CDB898",
        borderLeftColor: "#7B5C3A",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-[11px] mb-[14px] pb-3"
        style={{ borderBottom: "1px solid #DDD0BE" }}
      >
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 border-[1.5px]"
          style={{ background: "#EDE0CE", borderColor: "#7B5C3A" }}
        >
          <span className="text-[15px] leading-none">⚖</span>
        </div>
        <div className="flex-1">
          <p className="font-serif text-[14px] font-semibold" style={{ color: "#5C3D1E" }}>
            Observer's Verdict
          </p>
          <p className="text-[10px] mt-px" style={{ color: "#9A7A5A" }}>
            {afterLabel}
          </p>
        </div>
        {consensusScore > 0 && (
          <div className="text-right shrink-0">
            <p
              className="font-serif text-[24px] font-semibold leading-none"
              style={{ color: "#7B5C3A" }}
            >
              {consensusScore}%
            </p>
            <p
              className="text-[9px] uppercase tracking-[0.08em] mt-0.5"
              style={{ color: "#9A7A5A" }}
            >
              Consensus
            </p>
          </div>
        )}
      </div>

      {/* Consensus bar */}
      {consensusScore > 0 && (
        <div
          className="h-[4px] rounded-full mb-4 overflow-hidden"
          style={{ background: "#DDD0BE" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #7B5C3A, #B07228)",
              width: `${consensusScore}%`,
            }}
          />
        </div>
      )}

      {/* Agreements */}
      {checkpoint.agreements.length > 0 && (
        <div className="mb-3">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-[7px]"
            style={{ color: "#5A7A5A" }}
          >
            Points of agreement
          </p>
          {checkpoint.agreements.map((a, i) => (
            <p
              key={i}
              className="text-[12.5px] leading-[1.65] pl-3 mb-[5px] border-l-2"
              style={{ color: "#283828", borderLeftColor: "#7A9A7A" }}
            >
              {a}
            </p>
          ))}
        </div>
      )}

      {/* Disagreements */}
      {checkpoint.disagreements.length > 0 && (
        <div className="mb-3">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-[7px]"
            style={{ color: "#8A5A5A" }}
          >
            Points of contention
          </p>
          {checkpoint.disagreements.map((d, i) => (
            <p
              key={i}
              className="text-[12.5px] leading-[1.65] pl-3 mb-[5px] border-l-2"
              style={{ color: "#382828", borderLeftColor: "#B08A8A" }}
            >
              {d}
            </p>
          ))}
        </div>
      )}

      {/* Reason */}
      <p
        className="text-[12px] italic leading-[1.65] pt-[11px] border-t"
        style={{ color: "#7A6858", borderTopColor: "#DDD0BE" }}
      >
        {checkpoint.reason}
      </p>
    </div>
  );
}
