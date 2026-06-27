"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { ModelSelector } from "@/components/session/ModelSelector";
import { useModels } from "@/hooks/useModels";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";
import { getPersonaStyle } from "@/lib/utils";

type Intensity = "quick" | "standard" | "deep_dive";

const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: "quick",     label: "Low" },
  { value: "standard",  label: "Moderate" },
  { value: "deep_dive", label: "High" },
];

const COUNCIL_PREVIEW = [
  { id: "optimist",   role: "Finds the opportunity" },
  { id: "pessimist",  role: "Anticipates the risk" },
  { id: "contrarian", role: "Challenges the consensus" },
  { id: "observer",   role: "Synthesizes the truth" },
];

export default function HomePage() {
  const router = useRouter();
  const {
    defaultIntensity,
    defaultProvider,
    defaultModel,
    setDefaultIntensity,
    setDefaultProvider,
    setDefaultModel,
  } = useSettingsStore();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: models } = useModels();

  const hasModel = models?.providers.some((p) => p.configured) ?? false;
  const showOnboarding = models !== undefined && !hasModel;

  async function handleStart() {
    if (!question.trim() || loading) return;
    setLoading(true);
    try {
      const session = await api.createSession({
        question: question.trim(),
        intensity: defaultIntensity,
        model_provider: defaultProvider,
        model_name: defaultModel,
      });
      router.push(`/session/${session.id}`);
    } catch (e) {
      alert(`Failed to start session: ${e}`);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto items-center justify-center px-5 py-8">
      <div
        className="w-full max-w-[600px] flex flex-col gap-[38px] animate-home-in"
      >
        {/* Hero */}
        <div className="text-center">
          <h1 className="font-serif text-[38px] font-semibold leading-[1.18] text-foreground mb-[10px]">
            Put a hard question
            <br />
            <em className="text-muted">to the council.</em>
          </h1>
          <p className="text-[14px] text-muted font-light tracking-[0.025em]">
            Four AI personas debate every angle — you get the verdict.
          </p>
        </div>

        {showOnboarding ? (
          <ModelSetupCard />
        ) : (
          <div
            className="rounded-[14px] border border-border"
            style={{
              background: "rgb(var(--surface-raised))",
              boxShadow: "0 2px 18px rgba(28,24,20,0.08), 0 1px 4px rgba(28,24,20,0.04)",
            }}
          >
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart();
              }}
              placeholder="What should we do about…"
              rows={4}
              className="block w-full px-[22px] pt-5 pb-4 font-serif text-[18px] leading-[1.65] text-foreground bg-transparent border-none resize-none focus:outline-none"
            />
            <div className="px-[14px] pb-[13px] pt-[10px] border-t border-border flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted uppercase tracking-[0.1em]">
                  Intensity
                </span>
                <div className="flex border border-border rounded-[6px] overflow-hidden">
                  {INTENSITY_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      onClick={() => setDefaultIntensity(opt.value)}
                      className="text-[11px] px-[11px] py-1 transition-colors"
                      style={{
                        background: defaultIntensity === opt.value ? "rgb(var(--text))" : "transparent",
                        color: defaultIntensity === opt.value ? "rgb(var(--bg))" : "rgb(var(--text-dim))",
                        borderRight: i < INTENSITY_OPTIONS.length - 1 ? "1px solid rgb(var(--border))" : "none",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={handleStart}
                disabled={!question.trim() || loading}
                className="text-[13px] font-medium px-5 py-[9px] rounded-lg border-none cursor-pointer whitespace-nowrap transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgb(var(--text))", color: "rgb(var(--bg))" }}
              >
                {loading ? "Starting…" : "Ask the Council →"}
              </button>
            </div>
            {/* Model selector row */}
            <div className="px-[14px] pb-[12px]">
              <ModelSelector
                provider={defaultProvider}
                model={defaultModel}
                onProviderChange={setDefaultProvider}
                onModelChange={setDefaultModel}
              />
            </div>
          </div>
        )}

        {/* Council preview */}
        {!showOnboarding && (
          <div>
            <p className="text-[10px] text-muted uppercase tracking-[0.14em] text-center mb-[14px]">
              The Council
            </p>
            <div className="grid grid-cols-4 gap-[10px]">
              {COUNCIL_PREVIEW.map(({ id, role }) => {
                const style = getPersonaStyle(id);
                return (
                  <div
                    key={id}
                    className="border border-border rounded-[10px] px-3 pt-4 pb-[14px] text-center flex flex-col items-center gap-2"
                    style={{ background: "rgb(var(--surface-raised))" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center mb-0.5"
                      style={{ background: style.bg, borderColor: style.color }}
                    >
                      <span
                        className="font-serif text-[15px] font-medium"
                        style={{ color: style.color }}
                      >
                        {style.symbol}
                      </span>
                    </div>
                    <div>
                      <p className="font-serif text-[13px] font-semibold text-foreground mb-[3px]">
                        {style.name}
                      </p>
                      <p className="text-[10px] text-muted leading-[1.4]">{role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
