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
        className="flex items-center gap-3 py-3 w-full text-left select-none"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted whitespace-nowrap">
          {label}
        </span>
        <span className="flex-1 border-t border-border mt-px" />
      </button>
      {!collapsed && <div className="space-y-3">{children}</div>}
    </section>
  );
}
