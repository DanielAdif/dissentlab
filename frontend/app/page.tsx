/* frontend/app/page.tsx */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { IntensitySelector } from "@/components/session/IntensitySelector";
import { ModelSelector } from "@/components/session/ModelSelector";
import { useModels } from "@/hooks/useModels";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

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
    <div className="flex flex-col h-full items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-[18px] font-bold text-foreground">DissentLab</h1>
          <p className="text-[14px] text-muted">Put a hard question to the council.</p>
        </div>

        {showOnboarding ? (
          <ModelSetupCard />
        ) : (
          <div className="bg-surface-raised rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-border px-5 pt-4 pb-3 space-y-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart();
              }}
              placeholder="What should we do about…"
              rows={3}
              className="w-full bg-transparent text-[14px] leading-relaxed text-foreground placeholder:text-muted resize-none focus:outline-none"
            />
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <IntensitySelector value={defaultIntensity} onChange={setDefaultIntensity} />
                <ModelSelector
                  provider={defaultProvider}
                  model={defaultModel}
                  onProviderChange={setDefaultProvider}
                  onModelChange={setDefaultModel}
                />
              </div>
              <button
                onClick={handleStart}
                disabled={!question.trim() || loading}
                className="shrink-0 bg-foreground text-background text-[13px] font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Starting…" : "Start debate →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
