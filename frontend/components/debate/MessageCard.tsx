import type { DebateMessage } from "@/lib/api";

export function MessageCard({ message }: { message: DebateMessage }) {
  return (
    <div className="border-l-2 pl-4 py-1 border-border">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-semibold text-foreground">
          {message.persona_name}
        </span>
        {message.round_number > 0 && (
          <span className="text-xs text-muted">Round {message.round_number}</span>
        )}
        <span className="text-xs text-muted">· {message.confidence}</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {message.content}
      </p>
      {message.cited_sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {message.cited_sources.map((s) => (
            <span key={s} className="text-xs text-muted border border-border rounded px-1">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}
