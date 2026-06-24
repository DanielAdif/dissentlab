"use client";
import { QuestionForm } from "@/components/session/QuestionForm";
import { IntensitySelector } from "@/components/session/IntensitySelector";
import { ModelSelector } from "@/components/session/ModelSelector";

type Intensity = "quick" | "standard" | "deep_dive";

type BottomBarProps = {
  question: string;
  onQuestionChange: (v: string) => void;
  intensity: Intensity;
  onIntensityChange: (v: Intensity) => void;
  provider: string;
  onProviderChange: (v: string) => void;
  model: string;
  onModelChange: (v: string) => void;
  onStart: () => void;
  loading: boolean;
};

export function BottomBar({
  question,
  onQuestionChange,
  intensity,
  onIntensityChange,
  provider,
  onProviderChange,
  model,
  onModelChange,
  onStart,
  loading,
}: BottomBarProps) {
  return (
    <div className="border-t border-border bg-sidebar px-4 py-3 space-y-3 shrink-0">
      <QuestionForm value={question} onChange={onQuestionChange} />
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <IntensitySelector value={intensity} onChange={onIntensityChange} />
          <ModelSelector
            provider={provider}
            model={model}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
          />
        </div>
        <button
          onClick={onStart}
          disabled={!question.trim() || loading}
          className="shrink-0 mt-1 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Starting…" : "Start Council →"}
        </button>
      </div>
    </div>
  );
}
