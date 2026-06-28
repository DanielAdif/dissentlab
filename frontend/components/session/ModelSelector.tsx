"use client";
import { useModels, useOllamaModels } from "@/hooks/useModels";

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.5-mini-2026-03-17"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-pro"],
  moonshot: ["moonshot-v1-8k", "moonshot-v1-32k"],
  openrouter: ["openai/gpt-4o", "anthropic/claude-sonnet-4-6"],
};

export function ModelSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
}: {
  provider: string;
  model: string;
  onProviderChange: (p: string) => void;
  onModelChange: (m: string) => void;
}) {
  const { data } = useModels();
  const { data: ollamaData } = useOllamaModels(provider === "ollama");

  const configured = data?.providers.filter((p) => p.configured) ?? [];

  const modelOptions =
    provider === "ollama"
      ? (ollamaData?.models ?? ["qwen2.5:0.5b"])
      : (MODEL_OPTIONS[provider] ?? []);

  return (
    <div className="flex gap-2">
      <select
        value={provider}
        onChange={(e) => {
          onProviderChange(e.target.value);
          const models =
            e.target.value === "ollama"
              ? (ollamaData?.models ?? ["qwen2.5:0.5b"])
              : (MODEL_OPTIONS[e.target.value] ?? []);
          onModelChange(models[0] ?? "");
        }}
        className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
      >
        <option value="" disabled>Select provider</option>
        {configured.map((p) => (
          <option key={p.provider} value={p.provider}>
            {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
          </option>
        ))}
      </select>
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
      >
        {modelOptions.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
