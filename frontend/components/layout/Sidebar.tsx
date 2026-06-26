"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionList } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/settings/models", label: "Models" },
  { href: "/settings/personas", label: "Personas" },
  { href: "/history", label: "History" },
];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      onClick={toggle}
      className="text-[13px] text-muted hover:text-foreground transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-raised"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☾" : "☀"}
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: sessions } = useSessionList();

  return (
    <aside className="w-[240px] shrink-0 h-screen flex flex-col border-r border-border bg-surface overflow-y-auto scrollbar-thin">
      <div className="px-4 py-4 shrink-0 flex items-center justify-between">
        <span className="text-[13px] font-bold tracking-tight text-foreground">DissentLab</span>
        <ThemeToggle />
      </div>

      <Link
        href="/"
        className="px-4 py-2 text-[13px] text-muted hover:text-foreground transition-colors shrink-0"
      >
        + New debate
      </Link>

      <div className="px-4 pt-3 pb-1 shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          Recent
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {sessions?.slice(0, 30).map((s) => {
          const isActive = pathname === `/session/${s.id}`;
          return (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className={cn(
                "block px-4 py-2 mx-2 rounded-md text-[13px] truncate transition-colors",
                isActive
                  ? "bg-surface-raised text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface-raised"
              )}
            >
              {s.question}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-border py-2 shrink-0">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "block px-4 py-2 text-[12px] transition-colors",
              pathname === href ? "text-foreground" : "text-muted hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
