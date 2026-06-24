"use client";
import { cn } from "@/lib/utils";

type Intensity = "quick" | "standard" | "deep_dive";

const OPTIONS: { value: Intensity; label: string; description: string }[] = [
  { value: "quick", label: "Quick", description: "1 round, ~30s" },
  { value: "standard", label: "Standard", description: "3–5 rounds, 1–3 min" },
  { value: "deep_dive", label: "Deep Dive", description: "Up to 15 rounds" },
];

export function IntensitySelector({
  value,
  onChange,
}: {
  value: Intensity;
  onChange: (v: Intensity) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 py-2 px-3 rounded-md border text-sm transition-colors",
              value === opt.value
                ? "border-foreground bg-foreground/10 text-foreground"
                : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
            )}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs opacity-70">{opt.description}</div>
          </button>
        ))}
      </div>
      {value === "deep_dive" && (
        <p className="text-xs text-muted mt-2">
          Deep Dive runs up to 15 rounds and may use significantly more API tokens.
        </p>
      )}
    </div>
  );
}
