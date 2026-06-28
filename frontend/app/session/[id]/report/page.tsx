"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useSessionStore } from "@/stores/sessionStore";
import { ExportButton } from "@/components/report/ExportButton";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, j) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    const t = line.trim();
    if (t.startsWith("### ")) {
      return <h3 key={i} className="text-xs font-semibold text-muted uppercase tracking-wider mt-5 mb-1">{renderInline(t.slice(4))}</h3>;
    }
    if (t.startsWith("## ")) {
      return <h2 key={i} className="text-sm font-semibold text-muted uppercase tracking-wider border-b border-border pb-1 mt-6 mb-2">{renderInline(t.slice(3))}</h2>;
    }
    if (t.startsWith("# ")) {
      return <h1 key={i} className="text-base font-bold text-foreground mt-6 mb-3">{renderInline(t.slice(2))}</h1>;
    }
    if (t.startsWith("- ") || t.startsWith("· ") || t.startsWith("• ")) {
      return <li key={i} className="text-sm text-foreground/90 ml-4 list-none">· {renderInline(t.slice(2))}</li>;
    }
    if (t === "") return <br key={i} />;
    return <p key={i} className="text-sm text-foreground/90 leading-relaxed">{renderInline(t)}</p>;
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
            onClick={() => router.push(`/session/${id}?view=history`)}
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
