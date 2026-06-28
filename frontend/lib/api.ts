const BASE = "";

export type Session = {
  id: string;
  question: string;
  status: string;
  debate_intensity: string;
  model_summary: string;
  created_at: string;
  final_recommendation_preview: string;
};

export type DebateMessage = {
  id?: string;
  round_number: number;
  persona_id: string;
  persona_name: string;
  content: string;
  cited_sources: string[];
  confidence: string;
  created_at: string;
};

export type ObserverCheckpoint = {
  round_number: number;
  consensus_score: number;
  agreements: string[];
  disagreements: string[];
  should_continue: boolean;
  reason: string;
};

export type Provider = {
  provider: string;
  configured: boolean;
};

export type Persona = {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  enabled: number;
  is_default: number;
  model_provider: string;
  model_name: string;
  created_at: string;
  updated_at: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  createSession: (body: { question: string; intensity: string; model_provider: string; model_name: string }) =>
    request<Session>("/api/sessions", { method: "POST", body: JSON.stringify(body) }),

  listSessions: () => request<Session[]>("/api/sessions"),

  getSession: (id: string) =>
    request<Session & { messages: DebateMessage[]; checkpoints: ObserverCheckpoint[]; report: { content_markdown: string } | null }>(`/api/sessions/${id}`),

  deleteSession: (id: string) => request<void>(`/api/sessions/${id}`, { method: "DELETE" }),

  listProviders: () => request<{ providers: Provider[]; ollama_url: string }>("/api/models/providers"),

  listOllamaModels: () => request<{ models: string[] }>("/api/models/ollama/models"),

  setApiKey: (provider: string, key: string) =>
    request<{ provider: string; masked: string }>(`/api/models/keys/${provider}`, { method: "POST", body: JSON.stringify({ key }) }),

  deleteApiKey: (provider: string) =>
    request<void>(`/api/models/keys/${provider}`, { method: "DELETE" }),

  testProvider: (provider: string) =>
    request<{ ok: boolean; message: string }>(`/api/models/test/${provider}`),

  getSettings: () => request<{ ollama_url: string; default_intensity: string }>("/api/settings"),

  patchSettings: (patch: { ollama_url?: string; default_intensity?: string }) =>
    request<{ ollama_url: string; default_intensity: string }>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),

  listPersonas: () => request<Persona[]>("/api/personas"),

  createPersona: (body: { name: string; role: string; system_prompt: string }) =>
    request<Persona>("/api/personas", { method: "POST", body: JSON.stringify(body) }),

  updatePersona: (id: string, patch: { name?: string; role?: string; system_prompt?: string; enabled?: number }) =>
    request<Persona>(`/api/personas/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deletePersona: (id: string) => request<void>(`/api/personas/${id}`, { method: "DELETE" }),

  restoreDefaultPersonas: () =>
    request<{ ok: boolean }>("/api/personas/restore-defaults", { method: "POST" }),
};
