"use client";
import { useState } from "react";

type Props = {
  label: string;
  children: React.ReactNode;
};

export function RoundSection({ label, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 py-2 w-full text-left select-none"
      >
        <span className="text-xs text-muted">{collapsed ? "▶" : "▼"}</span>
        <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      </button>
      {!collapsed && <div className="space-y-3">{children}</div>}
    </section>
  );
}
