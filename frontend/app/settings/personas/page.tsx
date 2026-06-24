"use client";
import { useState } from "react";
import {
  usePersonas,
  useUpdatePersona,
  useDeletePersona,
  useRestoreDefaults,
  useCreatePersona,
} from "@/hooks/usePersonas";
import type { Persona } from "@/lib/api";

type DraftState = { name: string; role: string; system_prompt: string };

const emptyDraft: DraftState = { name: "", role: "", system_prompt: "" };

export default function PersonasPage() {
  const { data: personas, isLoading } = usePersonas();
  const updatePersona = useUpdatePersona();
  const deletePersona = useDeletePersona();
  const restoreDefaults = useRestoreDefaults();
  const createPersona = useCreatePersona();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [isCreating, setIsCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftState>(emptyDraft);

  function startEdit(p: Persona) {
    setEditing(p.id);
    setDraft({ name: p.name, role: p.role, system_prompt: p.system_prompt });
  }

  async function saveEdit(id: string) {
    await updatePersona.mutateAsync({ id, ...draft });
    setEditing(null);
  }

  async function handleCreate() {
    if (!newDraft.name.trim() || !newDraft.role.trim() || !newDraft.system_prompt.trim()) {
      return;
    }
    await createPersona.mutateAsync(newDraft);
    setIsCreating(false);
    setNewDraft(emptyDraft);
  }

  if (isLoading) {
    return (
      <div className="text-muted text-sm p-8">Loading…</div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Persona Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsCreating(true);
              setNewDraft(emptyDraft);
            }}
            className="text-xs bg-foreground text-background rounded px-3 py-1.5 hover:opacity-90 transition-opacity"
          >
            Add Persona
          </button>
          <button
            onClick={() => restoreDefaults.mutate()}
            disabled={restoreDefaults.isPending}
            className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30 transition-colors disabled:opacity-50"
          >
            Restore Defaults
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="border border-accent/40 rounded-md p-4 space-y-3 bg-card">
          <p className="text-xs text-muted uppercase tracking-wide">New Persona</p>
          <input
            value={newDraft.name}
            onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
            placeholder="Name"
          />
          <input
            value={newDraft.role}
            onChange={(e) => setNewDraft((d) => ({ ...d, role: e.target.value }))}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
            placeholder="Role description"
          />
          <textarea
            value={newDraft.system_prompt}
            onChange={(e) => setNewDraft((d) => ({ ...d, system_prompt: e.target.value }))}
            rows={4}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
            placeholder="System prompt"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createPersona.isPending}
              className="text-xs bg-foreground text-background rounded px-3 py-1.5 disabled:opacity-50"
            >
              {createPersona.isPending ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {personas?.map((p) => (
          <div key={p.id} className="border border-border rounded-md p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Toggle ${p.name}`}
                  onClick={() =>
                    updatePersona.mutate({ id: p.id, enabled: p.enabled ? 0 : 1 })
                  }
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    p.enabled ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 block w-3 h-3 rounded-full bg-white transition-transform ${
                      p.enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                {!!p.is_default && (
                  <span className="text-xs text-muted border border-border rounded px-1">
                    default
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="text-xs text-accent hover:underline"
                >
                  Edit
                </button>
                {!p.is_default && (
                  <button
                    type="button"
                    onClick={() => deletePersona.mutate(p.id)}
                    disabled={deletePersona.isPending}
                    className="text-xs text-pessimist hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {!editing && (
              <p className="text-xs text-muted">{p.role}</p>
            )}

            {editing === p.id && (
              <div className="space-y-2 pt-2 border-t border-border">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Name"
                />
                <input
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Role description"
                />
                <textarea
                  value={draft.system_prompt}
                  onChange={(e) => setDraft((d) => ({ ...d, system_prompt: e.target.value }))}
                  rows={4}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
                  placeholder="System prompt"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(p.id)}
                    disabled={updatePersona.isPending}
                    className="text-xs bg-foreground text-background rounded px-3 py-1.5 disabled:opacity-50"
                  >
                    {updatePersona.isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
