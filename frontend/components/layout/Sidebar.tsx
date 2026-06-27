"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
      suppressHydrationWarning
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

  return (
    <nav className="h-[46px] shrink-0 bg-surface border-b border-border flex items-center px-[18px] z-40">
      <Link
        href="/"
        className="font-serif text-[15px] font-bold tracking-[0.07em] text-foreground hover:opacity-80 transition-opacity"
      >
        <span>DISSENT</span>
        <span className="text-accent">LAB</span>
      </Link>
      <div className="w-px h-[14px] bg-border mx-4" />
      <Link
        href="/history"
        className={cn(
          "text-[12px] px-2 py-1 rounded-[5px] transition-colors",
          pathname === "/history" ? "text-foreground" : "text-muted hover:text-foreground"
        )}
      >
        History
      </Link>
      <Link
        href="/settings/models"
        className={cn(
          "text-[12px] px-2 py-1 rounded-[5px] transition-colors",
          pathname?.startsWith("/settings") ? "text-foreground" : "text-muted hover:text-foreground"
        )}
      >
        Settings
      </Link>
      <div className="flex-1" />
      <ThemeToggle />
      <span className="text-[10px] text-muted/70 tracking-[0.06em] ml-3 select-none">
        AI COUNCIL · v1
      </span>
    </nav>
  );
}
