"use client";
import { useRouter } from "next/navigation";
import { useSessionList } from "@/hooks/useSession";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function HistoryPage() {
  const { data: sessions, isLoading } = useSessionList();
  const router = useRouter();
  const qc = useQueryClient();
  const deleteSession = useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const STATUS_COLORS: Record<string, string> = {
    completed: "text-optimist",
    running: "text-contrarian",
    error: "text-pessimist",
    pending: "text-muted",
  };

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold">Session History</h1>

      {!sessions?.length && (
        <p className="text-muted text-sm">No sessions yet. Start a council from the home page.</p>
      )}

      <div className="space-y-1">
        {sessions?.map((s) => (
          <div key={s.id} className="border border-border rounded-md px-4 py-3 flex items-center gap-3 hover:border-foreground/20 transition-colors">
            <button className="flex-1 text-left" onClick={() => router.push(`/session/${s.id}`)}>
              <div className="text-sm text-foreground truncate">{s.question}</div>
              <div className="text-xs text-muted mt-0.5">
                {new Date(s.created_at).toLocaleDateString()} · {s.debate_intensity} · {s.model_summary}
              </div>
              {s.final_recommendation_preview && (
                <div className="text-xs text-muted mt-1 truncate">{s.final_recommendation_preview}</div>
              )}
            </button>
            <span className={`text-xs shrink-0 ${STATUS_COLORS[s.status] ?? "text-muted"}`}>{s.status}</span>
            <button
              onClick={() => { if (confirm("Delete this session?")) deleteSession.mutate(s.id); }}
              className="text-xs text-muted hover:text-pessimist transition-colors shrink-0"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
