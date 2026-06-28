import { getPersonaStyle } from "@/lib/utils";
import type { DebateMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

type Props = {
  message?: DebateMessage;
  personaId: string;
};

export function MessageCard({ message, personaId }: Props) {
  const style = getPersonaStyle(personaId);
  const isWaiting = !message;

  return (
    <div
      className={cn("rounded-lg px-[13px] py-3 border border-l-[3px] min-h-[88px] animate-msg-in")}
      style={{
        background: isWaiting ? "#F0EBE8" : style.bg,
        borderTopColor: isWaiting ? "#DDD5CB" : style.color + "33",
        borderRightColor: isWaiting ? "#DDD5CB" : style.color + "33",
        borderBottomColor: isWaiting ? "#DDD5CB" : style.color + "33",
        borderLeftColor: style.color,
      }}
    >
      <div className="flex items-center gap-[7px] mb-2">
        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 border-[1.5px]"
          style={{ background: style.bg, borderColor: style.color }}
        >
          <span
            className="font-serif text-[10px] font-medium"
            style={{ color: style.color }}
          >
            {style.symbol}
          </span>
        </div>
        <span className="font-serif text-[11.5px] font-semibold text-foreground flex-1 min-w-0 truncate">
          {style.name}
        </span>
        {message && (
          <span className="text-[9.5px] text-muted shrink-0">{message.confidence}</span>
        )}
      </div>
      <p
        className={cn(
          "text-[12.5px] leading-[1.72]",
          isWaiting ? "text-muted italic" : "text-foreground"
        )}
      >
        {message ? renderInline(message.content) : "Preparing position…"}
      </p>
      {message && message.cited_sources.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
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
