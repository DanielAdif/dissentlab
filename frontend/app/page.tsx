"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { BottomBar } from "@/components/layout/BottomBar";
import { useModels } from "@/hooks/useModels";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const { defaultIntensity, defaultProvider, defaultModel, setDefaultIntensity, setDefaultProvider, setDefaultModel } =
    useSettingsStore();
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
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-4">
        {showOnboarding && <ModelSetupCard />}
      </div>
      <BottomBar
        question={question}
        onQuestionChange={setQuestion}
        intensity={defaultIntensity}
        onIntensityChange={setDefaultIntensity}
        provider={defaultProvider}
        onProviderChange={setDefaultProvider}
        model={defaultModel}
        onModelChange={setDefaultModel}
        onStart={handleStart}
        loading={loading}
      />
    </div>
  );
}
