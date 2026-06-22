"use client";
import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { getPersonaColor } from "@/lib/utils";

export function SourcePanel() {
  const [open, setOpen] = useState(false);
  const sources = useSessionStore((s) => s.sources);

  if (sources.length === 0) return null;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <span>Sources ({sources.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {sources.map((src, i) => (
            <div key={i} className="px-4 py-2 space-y-1">
              <div className="flex items-center gap-2">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline truncate flex-1"
                >
                  {src.title || src.domain}
                </a>
                <span className={`text-xs ${getPersonaColor(src.persona_id).split(" ")[0]}`}>
                  {src.persona_id}
                </span>
              </div>
              <div className="text-xs text-muted">{src.domain}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
