"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionList } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/settings/models", label: "Models" },
  { href: "/settings/personas", label: "Personas" },
  { href: "/history", label: "History" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: sessions } = useSessionList();

  return (
    <aside className="w-[260px] shrink-0 h-screen flex flex-col border-r border-border bg-sidebar overflow-y-auto">
      <div className="px-4 py-4 shrink-0">
        <span className="text-sm font-semibold text-foreground">DissentLab</span>
      </div>

      <Link
        href="/"
        className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors shrink-0"
      >
        + New Session
      </Link>

      <div className="flex-1 overflow-y-auto py-1">
        {sessions?.slice(0, 30).map((s) => {
          const isActive = pathname === `/session/${s.id}`;
          return (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className={cn(
                "block px-4 py-2 mx-2 rounded-md text-sm truncate transition-colors",
                isActive
                  ? "bg-card text-foreground"
                  : "text-muted hover:text-foreground hover:bg-card"
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
              "block px-4 py-2 text-sm transition-colors",
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
