import { getPersonaStyle } from "@/lib/utils";
import type { DebateMessage } from "@/lib/api";

export function MessageCard({ message }: { message: DebateMessage }) {
  const style = getPersonaStyle(message.persona_id);
  const initials = message.persona_name.slice(0, 2).toUpperCase();

  return (
    <div className={`rounded-2xl px-4 py-3 ${style.bubbleBg}`}>
      <div className="flex items-start gap-3 mb-1">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-foreground shrink-0 ${style.avatarBg}`}
        >
          {initials}
        </div>
        <div className="flex items-baseline gap-2 pt-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{message.persona_name}</span>
          {message.round_number > 0 && (
            <span className="text-xs text-muted">Round {message.round_number}</span>
          )}
          <span className="text-xs text-muted">· {message.confidence}</span>
        </div>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap ml-10">
        {message.content}
      </p>
      {message.cited_sources.length > 0 && (
        <div className="mt-1 ml-10 flex flex-wrap gap-1">
          {message.cited_sources.map((s) => (
            <span key={s} className="text-xs text-muted border border-border rounded px-1">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
