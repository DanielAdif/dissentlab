"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionForm } from "@/components/session/QuestionForm";
import { IntensitySelector } from "@/components/session/IntensitySelector";
import { ModelSelector } from "@/components/session/ModelSelector";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { useModels } from "@/hooks/useModels";
import { useSessionList } from "@/hooks/useSession";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "@/lib/time";

function formatTime(iso: string): string {
  try {
    return formatDistanceToNow(iso);
  } catch {
    return "";
  }
}

export default function HomePage() {
  const router = useRouter();
  const { defaultIntensity, defaultProvider, defaultModel, setDefaultIntensity, setDefaultProvider, setDefaultModel } = useSettingsStore();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: models } = useModels();
  const { data: sessions } = useSessionList();

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
    <main className="min-h-screen flex flex-col items-center justify-start pt-20 px-4">
      {showOnboarding && <ModelSetupCard />}

      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">DissentLab</h1>
          <p className="text-sm text-muted">AI council research and debate</p>
        </div>

        <div className="space-y-4">
          <QuestionForm value={question} onChange={setQuestion} />

          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Debate Intensity</label>
            <IntensitySelector value={defaultIntensity} onChange={setDefaultIntensity} />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Model</label>
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
            className="w-full py-3 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Starting…" : "Start Council"}
          </button>
        </div>

        {sessions && sessions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs text-muted uppercase tracking-wider">Recent Sessions</h2>
            <div className="space-y-1">
              {sessions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/session/${s.id}`)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-card border border-transparent hover:border-border transition-all group"
                >
                  <div className="text-sm text-foreground truncate group-hover:text-accent">{s.question}</div>
                  <div className="text-xs text-muted">{formatTime(s.created_at)} · {s.debate_intensity}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
