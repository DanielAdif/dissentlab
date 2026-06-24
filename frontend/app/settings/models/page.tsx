"use client";
import { useState } from "react";
import { useModels, useSetApiKey, useDeleteApiKey, useTestProvider } from "@/hooks/useModels";
import { api } from "@/lib/api";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  moonshot: "Moonshot / Kimi",
  openrouter: "OpenRouter",
  ollama: "Ollama (local)",
};

export default function ModelSettingsPage() {
  const { data, isLoading } = useModels();
  const setKey = useSetApiKey();
  const deleteKey = useDeleteApiKey();
  const testProvider = useTestProvider();
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [ollamaUrl, setOllamaUrl] = useState(data?.ollama_url ?? "");

  async function handleSaveKey(provider: string) {
    const key = keyInputs[provider];
    if (!key) return;
    await setKey.mutateAsync({ provider, key });
    setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
  }

  async function handleTest(provider: string) {
    const result = await testProvider.mutateAsync(provider);
    setTestResults((prev) => ({ ...prev, [provider]: result }));
  }

  async function handleSaveOllama() {
    await api.patchSettings({ ollama_url: ollamaUrl });
  }

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  const providers = data?.providers ?? [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold">Model Settings</h1>

      <div className="border border-border rounded-md p-4 space-y-3">
        <h2 className="text-sm font-medium text-foreground">Ollama (local models)</h2>
        <div className="flex gap-2">
          <input
            value={ollamaUrl || data?.ollama_url || ""}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://host.docker.internal:11434"
            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
          />
          <button onClick={handleSaveOllama} className="text-xs bg-foreground text-background rounded px-3 py-1.5">Save</button>
          <button onClick={() => handleTest("ollama")} className="text-xs border border-border rounded px-3 py-1.5 text-muted hover:border-foreground/30">Test</button>
        </div>
        {testResults["ollama"] && (
          <p className={`text-xs ${testResults["ollama"].ok ? "text-optimist" : "text-pessimist"}`}>
            {testResults["ollama"].message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {providers.filter((p) => p.provider !== "ollama").map((p) => (
          <div key={p.provider} className="border border-border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">{PROVIDER_LABELS[p.provider] ?? p.provider}</h2>
              {p.configured && (
                <span className="text-xs text-optimist">Configured</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInputs[p.provider] ?? ""}
                onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                placeholder={p.configured ? "Update API key…" : "Enter API key…"}
                className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
              />
              <button onClick={() => handleSaveKey(p.provider)} className="text-xs bg-foreground text-background rounded px-3 py-1.5">Save</button>
              {p.configured && (
                <>
                  <button onClick={() => handleTest(p.provider)} className="text-xs border border-border rounded px-3 py-1.5 text-muted hover:border-foreground/30">Test</button>
                  <button onClick={() => deleteKey.mutate(p.provider)} className="text-xs border border-pessimist/40 rounded px-3 py-1.5 text-pessimist hover:bg-pessimist/10">Delete</button>
                </>
              )}
            </div>
            {testResults[p.provider] && (
              <p className={`text-xs ${testResults[p.provider].ok ? "text-optimist" : "text-pessimist"}`}>
                {testResults[p.provider].message}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
