"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useSessionStore } from "@/stores/sessionStore";
import { ExportButton } from "@/components/report/ExportButton";

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-sm font-semibold text-muted uppercase tracking-wider border-b border-border pb-1 mt-6 mb-2">{line.slice(3)}</h2>;
    }
    if (line.startsWith("- ")) {
      return <li key={i} className="text-sm text-foreground/90 ml-4">· {line.slice(2)}</li>;
    }
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm text-foreground/90 leading-relaxed">{line}</p>;
  });
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSessionStore();
  const { data: session } = useSession(id);

  const reportContent = store.finalReport ?? session?.report?.content_markdown ?? "";

  if (!reportContent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">Loading report…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push(`/session/${id}`)}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            ← Back to debate
          </button>
          <h1 className="text-xl font-semibold">Final Report</h1>
        </div>
        <ExportButton
          content={reportContent}
          filename={`dissentlab-${id}-report.md`}
        />
      </div>

      {session?.question && (
        <div className="border-b border-border pb-4">
          <p className="text-xs text-muted mb-1">Question</p>
          <p className="text-base text-foreground">{session.question}</p>
        </div>
      )}

      <div className="space-y-1">
        {renderMarkdown(reportContent)}
      </div>
    </main>
  );
}
