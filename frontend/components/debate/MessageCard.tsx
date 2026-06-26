/* frontend/components/debate/MessageCard.tsx */
import { getPersonaStyle } from "@/lib/utils";
import type { DebateMessage } from "@/lib/api";

export function MessageCard({ message }: { message: DebateMessage }) {
  const style = getPersonaStyle(message.persona_id);
  const initials = message.persona_name.slice(0, 2).toUpperCase();
  const metadata =
    message.round_number > 0
      ? `Round ${message.round_number} · ${message.confidence}`
      : message.confidence;

  return (
    <div
      className="bg-surface-raised rounded-lg pl-4 pr-4 py-3 border-l-2"
      style={{ borderLeftColor: style.stripeColor }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-[22px] h-[22px] rounded-full bg-surface flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-muted">{initials}</span>
        </div>
        <span className="text-[13px] font-semibold text-foreground">{message.persona_name}</span>
        <span className="flex-1" />
        <span className="text-[11px] text-muted">{metadata}</span>
      </div>
      <p className="text-[14px] leading-[1.65] text-foreground/90 whitespace-pre-wrap mt-2 ml-8">
        {message.content}
      </p>
      {message.cited_sources.length > 0 && (
        <div className="mt-1.5 ml-8 flex flex-wrap gap-1">
          {message.cited_sources.map((s) => (
            <span
              key={s}
              className="text-[11px] text-muted border border-border rounded px-1.5 py-0.5"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
