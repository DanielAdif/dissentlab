# Scholar's Notebook Visual Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Scholar's Notebook visual design to DissentLab — warm-gray dual-mode palette, Lora-italic session questions, and persona voice-stripe bubbles.

**Architecture:** CSS custom properties drive both light and dark modes via a `.dark` class on `<html>`; Tailwind config maps tokens to those vars; a client-side ThemeToggle in the Sidebar reads/writes `localStorage` and flips the class.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Vitest + React Testing Library, `next/font/google`

## Global Constraints

- Run tests with: `cd frontend && pnpm vitest run` (or `pnpm test`)
- All Tailwind classes must resolve — no arbitrary hex values in JSX except for persona `stripeColor` passed via `style={{ borderLeftColor }}`.
- `"use client"` required on any file using hooks, state, or DOM APIs.
- Backward-compat Tailwind aliases (`card`, `sidebar`, `checkpoint`, `accent`) kept so untouched components don't break.
- `BottomBar.tsx` is no longer rendered after the home page rewrite — do not touch it.
- `QuestionForm.tsx`, `IntensitySelector.tsx`, `ModelSelector.tsx` use token names that still resolve through aliases — do not touch them.
- Lora: only `style: ["italic"]` subset needed, no extra weights.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/app/globals.css` | Modify | CSS custom properties for light (`:root`) and dark (`.dark`) |
| `frontend/tailwind.config.ts` | Modify | Map token names to CSS vars; add stripe tokens |
| `frontend/app/layout.tsx` | Modify | Load Inter + Lora via `next/font`; add theme-init `<script>` |
| `frontend/components/layout/Sidebar.tsx` | Modify | New styles + inline `ThemeToggle` component |
| `frontend/tests/components/layout/Sidebar.test.tsx` | Modify | Update `"+ New Session"` → `"+ New debate"` |
| `frontend/lib/utils.ts` | Modify | Change `PersonaStyle` to `{ stripeColor: string }` |
| `frontend/app/page.tsx` | Modify | Centered home-page layout with inline input card |
| `frontend/components/debate/MessageCard.tsx` | Modify | Left-border stripe; new header row layout |
| `frontend/tests/components/debate/MessageCard.test.tsx` | Modify | Update confidence assertion for new combined format |
| `frontend/components/debate/RoundSection.tsx` | Modify | Hairline rule label; remove chevron |
| `frontend/components/debate/ObserverCheckpoint.tsx` | Modify | Structural treatment; warm-gray tokens |
| `frontend/app/session/[id]/page.tsx` | Modify | Sticky header with Lora italic question |
| `frontend/components/ui/ErrorBanner.tsx` | Modify | Warm-gray surface tokens |

---

## Task 1: CSS Custom Properties + Tailwind Token Swap

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/tailwind.config.ts`

**Interfaces:**
- Produces: CSS vars `--bg`, `--surface`, `--surface-raised`, `--border`, `--text`, `--text-dim` consumed by every subsequent task via Tailwind utilities.

- [ ] **Step 1: Replace globals.css**

```css
/* frontend/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg:             #f7f7f5;
    --surface:        #eeebe6;
    --surface-raised: #ffffff;
    --border:         #dedad5;
    --text:           #1a1817;
    --text-dim:       #8a857e;
    color-scheme: light;
  }

  .dark {
    --bg:             #0d0d0b;
    --surface:        #141411;
    --surface-raised: #1c1c19;
    --border:         #2a2a26;
    --text:           #e8e4de;
    --text-dim:       #6b6560;
    color-scheme: dark;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  * {
    @apply border-border;
  }
}

@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
}
```

- [ ] **Step 2: Replace tailwind.config.ts**

```ts
/* frontend/tailwind.config.ts */
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary token names (new)
        background:       "var(--bg)",
        foreground:       "var(--text)",
        surface:          "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        border:           "var(--border)",
        muted:            "var(--text-dim)",
        // Backward-compat aliases — untouched components still compile
        card:             "var(--surface-raised)",
        sidebar:          "var(--surface)",
        checkpoint:       "var(--surface)",
        accent:           "var(--text-dim)",
        // Persona voice stripes — fixed warm-gray values, same in both modes
        "stripe-optimist":   "#9b8f82",
        "stripe-pessimist":  "#5f5550",
        "stripe-contrarian": "#b5a99b",
        "stripe-observer":   "#c8bdb0",
      },
      fontFamily: {
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Verify build compiles**

```bash
cd frontend && pnpm build
```

Expected: build succeeds (Tailwind resolves all class names through vars).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/globals.css frontend/tailwind.config.ts
git commit -m "feat: add CSS custom property tokens for Scholar's Notebook light/dark modes"
```

---

## Task 2: Fonts + Layout + Theme Init Script

**Files:**
- Modify: `frontend/app/layout.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: CSS variables `--font-inter` and `--font-lora` on `<html>`; `.dark` class applied before first paint; `font-serif` Tailwind utility resolves to Lora italic.

- [ ] **Step 1: Replace layout.tsx**

```tsx
/* frontend/app/layout.tsx */
import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "DissentLab",
  description: "AI council research and debate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${lora.variable}`}>
      <head>
        {/* Runs before paint: applies user's saved theme, preventing flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex h-screen overflow-hidden">
        <Providers>
          <Sidebar />
          <div className="flex-1 h-screen overflow-y-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build still compiles**

```bash
cd frontend && pnpm build
```

Expected: no errors; Next.js resolves `next/font/google` at build time.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "feat: load Inter + Lora via next/font and add theme-init script to layout"
```

---

## Task 3: Update getPersonaStyle in utils.ts

**Files:**
- Modify: `frontend/lib/utils.ts`

**Interfaces:**
- Produces: `getPersonaStyle(personaId: string): PersonaStyle` where `PersonaStyle = { stripeColor: string }`.
- Consumed by: `MessageCard.tsx` (Task 6).

- [ ] **Step 1: Write the failing test**

Add to `frontend/tests/lib/utils.test.ts` (append; do not replace existing tests):

```ts
import { getPersonaStyle } from "@/lib/utils";

describe("getPersonaStyle (Scholar's Notebook)", () => {
  it("returns stripeColor for optimist", () => {
    expect(getPersonaStyle("optimist").stripeColor).toBe("#9b8f82");
  });

  it("returns stripeColor for pessimist", () => {
    expect(getPersonaStyle("pessimist").stripeColor).toBe("#5f5550");
  });

  it("returns stripeColor for contrarian", () => {
    expect(getPersonaStyle("contrarian").stripeColor).toBe("#b5a99b");
  });

  it("returns stripeColor for observer", () => {
    expect(getPersonaStyle("observer").stripeColor).toBe("#c8bdb0");
  });

  it("returns fallback stripeColor for unknown persona", () => {
    expect(getPersonaStyle("unknown").stripeColor).toBe("#9b8f82");
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd frontend && pnpm vitest run tests/lib/utils.test.ts
```

Expected: FAIL — `stripeColor` does not exist on the current `PersonaStyle` type.

- [ ] **Step 3: Replace utils.ts**

```ts
/* frontend/lib/utils.ts */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PersonaStyle = {
  stripeColor: string;
};

const PERSONA_STYLES: Record<string, PersonaStyle> = {
  optimist:   { stripeColor: "#9b8f82" },
  pessimist:  { stripeColor: "#5f5550" },
  contrarian: { stripeColor: "#b5a99b" },
  observer:   { stripeColor: "#c8bdb0" },
};

const FALLBACK: PersonaStyle = { stripeColor: "#9b8f82" };

export function getPersonaStyle(personaId: string): PersonaStyle {
  return PERSONA_STYLES[personaId] ?? FALLBACK;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend && pnpm vitest run tests/lib/utils.test.ts
```

Expected: all 5 new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/utils.ts frontend/tests/lib/utils.test.ts
git commit -m "feat: update getPersonaStyle to return stripeColor for voice-stripe bubbles"
```

---

## Task 4: Sidebar with ThemeToggle

**Files:**
- Modify: `frontend/components/layout/Sidebar.tsx`
- Modify: `frontend/tests/components/layout/Sidebar.test.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `ThemeToggle` (internal), `Sidebar` with `"+ New debate"` link label.

- [ ] **Step 1: Update Sidebar test to match new label**

In `frontend/tests/components/layout/Sidebar.test.tsx`, change:

```ts
// OLD:
it("renders New Session link", () => {
  wrap(<Sidebar />);
  expect(screen.getByText("+ New Session")).toBeDefined();
});
```

to:

```ts
// NEW:
it("renders New debate link", () => {
  wrap(<Sidebar />);
  expect(screen.getByText("+ New debate")).toBeDefined();
});
```

Also add a test for the theme toggle:

```ts
it("renders theme toggle button", () => {
  wrap(<Sidebar />);
  expect(screen.getByRole("button", { name: /switch to (light|dark) mode/i })).toBeDefined();
});
```

- [ ] **Step 2: Run existing Sidebar tests to confirm the label test fails**

```bash
cd frontend && pnpm vitest run tests/components/layout/Sidebar.test.tsx
```

Expected: `"renders New debate link"` FAIL (still finds old text), theme toggle test FAIL.

- [ ] **Step 3: Replace Sidebar.tsx**

```tsx
/* frontend/components/layout/Sidebar.tsx */
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
```

- [ ] **Step 4: Run Sidebar tests — expect all PASS**

```bash
cd frontend && pnpm vitest run tests/components/layout/Sidebar.test.tsx
```

Expected: all 5 tests PASS (wordmark, new-debate link, nav links, session list, theme toggle).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/layout/Sidebar.tsx frontend/tests/components/layout/Sidebar.test.tsx
git commit -m "feat: redesign Sidebar with warm-gray tokens and ThemeToggle"
```

---

## Task 5: Home Page Centered Layout

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `IntensitySelector`, `ModelSelector`, `ModelSetupCard` (unchanged APIs).
- `BottomBar` is no longer imported — it is now dead code and untouched.

- [ ] **Step 1: Replace page.tsx**

```tsx
/* frontend/app/page.tsx */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { IntensitySelector } from "@/components/session/IntensitySelector";
import { ModelSelector } from "@/components/session/ModelSelector";
import { useModels } from "@/hooks/useModels";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const {
    defaultIntensity,
    defaultProvider,
    defaultModel,
    setDefaultIntensity,
    setDefaultProvider,
    setDefaultModel,
  } = useSettingsStore();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: models } = useModels();

  const hasModel = models?.providers.some((p) => p.configured) ?? false;
  const showOnboarding = models !== undefined && !hasModel;

  async function handleStart() {
    if (!question.trim() || loading) return;
    setLoading(true);
    try {
      const session = await api.createSession({
        question: question.trim(),
        intensity: defaultIntensity,
        model_provider: defaultProvider,
        model_name: defaultModel,
      });
      router.push(`/session/${session.id}`);
    } catch (e) {
      alert(`Failed to start session: ${e}`);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-[18px] font-bold text-foreground">DissentLab</h1>
          <p className="text-[14px] text-muted">Put a hard question to the council.</p>
        </div>

        {showOnboarding ? (
          <ModelSetupCard />
        ) : (
          <div className="bg-surface-raised rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-border px-5 pt-4 pb-3 space-y-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart();
              }}
              placeholder="What should we do about…"
              rows={3}
              className="w-full bg-transparent text-[14px] leading-relaxed text-foreground placeholder:text-muted resize-none focus:outline-none"
            />
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <IntensitySelector value={defaultIntensity} onChange={setDefaultIntensity} />
                <ModelSelector
                  provider={defaultProvider}
                  model={defaultModel}
                  onProviderChange={setDefaultProvider}
                  onModelChange={setDefaultModel}
                />
              </div>
              <button
                onClick={handleStart}
                disabled={!question.trim() || loading}
                className="shrink-0 bg-foreground text-background text-[13px] font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Starting…" : "Start debate →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite to confirm nothing broke**

```bash
cd frontend && pnpm vitest run
```

Expected: all existing tests PASS (page.tsx has no unit tests; behavioral tests are unaffected).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: redesign home page as centered input card (Claude-style empty state)"
```

---

## Task 6: MessageCard — Voice Stripe Approach

**Files:**
- Modify: `frontend/components/debate/MessageCard.tsx`
- Modify: `frontend/tests/components/debate/MessageCard.test.tsx`

**Interfaces:**
- Consumes: `getPersonaStyle(personaId): { stripeColor: string }` from Task 3.
- `style.stripeColor` applied as `borderLeftColor` via inline style.

- [ ] **Step 1: Update the failing tests first**

In `frontend/tests/components/debate/MessageCard.test.tsx`, make these changes:

```tsx
// CHANGE: "renders round number when > 0"
it("renders round number when > 0", () => {
  render(<MessageCard message={baseMessage} />);
  // round_number=1 and confidence="High" now render together
  expect(screen.getByText("Round 1 · High")).toBeDefined();
});

// CHANGE: "does not render round label when round_number is 0"
it("does not render round label when round_number is 0", () => {
  const msg = { ...baseMessage, round_number: 0 };
  render(<MessageCard message={msg} />);
  expect(screen.queryByText(/Round/)).toBeNull();
  expect(screen.getByText("High")).toBeDefined();
});

// CHANGE: "renders confidence"
it("renders confidence", () => {
  render(<MessageCard message={baseMessage} />);
  expect(screen.getByText("Round 1 · High")).toBeDefined();
});
```

Full updated test file:

```tsx
/* frontend/tests/components/debate/MessageCard.test.tsx */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageCard } from "@/components/debate/MessageCard";
import type { DebateMessage } from "@/lib/api";

const baseMessage: DebateMessage = {
  round_number: 1,
  persona_id: "optimist",
  persona_name: "Optimist",
  content: "This looks promising.",
  cited_sources: ["source-a"],
  confidence: "High",
  created_at: "",
};

describe("MessageCard", () => {
  it("renders persona name", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("Optimist")).toBeDefined();
  });

  it("renders content", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("This looks promising.")).toBeDefined();
  });

  it("renders round number and confidence together when round > 0", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("Round 1 · High")).toBeDefined();
  });

  it("renders only confidence when round_number is 0", () => {
    const msg = { ...baseMessage, round_number: 0 };
    render(<MessageCard message={msg} />);
    expect(screen.queryByText(/Round/)).toBeNull();
    expect(screen.getByText("High")).toBeDefined();
  });

  it("renders cited sources", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("source-a")).toBeDefined();
  });

  it("does not render sources section when empty", () => {
    const msg = { ...baseMessage, cited_sources: [] };
    render(<MessageCard message={msg} />);
    expect(screen.queryByText("source-a")).toBeNull();
  });

  it("renders avatar initials from persona name", () => {
    render(<MessageCard message={baseMessage} />);
    expect(screen.getByText("OP")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd frontend && pnpm vitest run tests/components/debate/MessageCard.test.tsx
```

Expected: `"renders round number and confidence together"` and `"renders only confidence"` FAIL (old component still splits them).

- [ ] **Step 3: Replace MessageCard.tsx**

```tsx
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
```

- [ ] **Step 4: Run tests — expect all PASS**

```bash
cd frontend && pnpm vitest run tests/components/debate/MessageCard.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/debate/MessageCard.tsx frontend/tests/components/debate/MessageCard.test.tsx
git commit -m "feat: redesign MessageCard with persona voice-stripe (left border) approach"
```

---

## Task 7: RoundSection — Hairline Rule Label

**Files:**
- Modify: `frontend/components/debate/RoundSection.tsx`

**Interfaces:**
- No interface changes. All existing RoundSection tests pass without modification (they test collapse behavior, not chevron text).

- [ ] **Step 1: Run existing tests to confirm they currently PASS**

```bash
cd frontend && pnpm vitest run tests/components/debate/RoundSection.test.tsx
```

Expected: all 4 tests PASS (baseline).

- [ ] **Step 2: Replace RoundSection.tsx**

```tsx
/* frontend/components/debate/RoundSection.tsx */
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
```

- [ ] **Step 3: Run tests — expect all still PASS**

```bash
cd frontend && pnpm vitest run tests/components/debate/RoundSection.test.tsx
```

Expected: all 4 tests PASS (behavior unchanged; only styling changed).

- [ ] **Step 4: Commit**

```bash
git add frontend/components/debate/RoundSection.tsx
git commit -m "feat: redesign RoundSection with hairline rule label (remove chevron)"
```

---

## Task 8: ObserverCheckpoint — Structural Treatment

**Files:**
- Modify: `frontend/components/debate/ObserverCheckpoint.tsx`

**Interfaces:**
- No interface changes. All existing tests pass (text content preserved: `"Observer — Round N"`, `"65%"`, agreements/disagreements/reason).

- [ ] **Step 1: Run existing tests as baseline**

```bash
cd frontend && pnpm vitest run tests/components/debate/ObserverCheckpoint.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 2: Replace ObserverCheckpoint.tsx**

```tsx
/* frontend/components/debate/ObserverCheckpoint.tsx */
import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensus = Math.round(checkpoint.consensus_score * 100);

  return (
    <div className="bg-surface rounded-lg px-5 py-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          Observer — Round {checkpoint.round_number}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-[2px] bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-muted rounded-full"
              style={{ width: `${consensus}%` }}
            />
          </div>
          <span className="text-[11px] text-muted">{consensus}%</span>
        </div>
      </div>

      {checkpoint.agreements.length > 0 && (
        <div>
          <div className="text-[11px] text-muted mb-1">Agreements</div>
          <ul className="space-y-0.5">
            {checkpoint.agreements.map((a, i) => (
              <li key={i} className="text-[14px] text-foreground/80">
                · {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkpoint.disagreements.length > 0 && (
        <div>
          <div className="text-[11px] text-muted mb-1">Disagreements</div>
          <ul className="space-y-0.5">
            {checkpoint.disagreements.map((d, i) => (
              <li key={i} className="text-[14px] text-foreground/80">
                · {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted italic">{checkpoint.reason}</p>
    </div>
  );
}
```

- [ ] **Step 3: Run tests — expect all PASS**

```bash
cd frontend && pnpm vitest run tests/components/debate/ObserverCheckpoint.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/debate/ObserverCheckpoint.tsx
git commit -m "feat: redesign ObserverCheckpoint with structural warm-gray treatment"
```

---

## Task 9: Session Page Header + ErrorBanner

**Files:**
- Modify: `frontend/app/session/[id]/page.tsx`
- Modify: `frontend/components/ui/ErrorBanner.tsx`

**Interfaces:**
- Consumes: `font-serif` Tailwind utility (resolves to Lora italic from Task 2).
- `PhaseIndicator` component is unchanged.

- [ ] **Step 1: Update the session page sticky header**

In `frontend/app/session/[id]/page.tsx`, replace the sticky header div (lines 56–73) with:

```tsx
<div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-sm border-b border-border px-5 py-3 flex items-start gap-4 shrink-0">
  <p className="font-serif italic text-[15px] text-foreground flex-1 truncate leading-snug">
    {store.question}
  </p>
  <div className="flex items-center gap-3 shrink-0 pt-0.5">
    <PhaseIndicator phase={store.phase} round={currentRound} />
    <button
      onClick={() => store.setAutoScroll(!store.autoScroll)}
      className="text-[11px] text-muted border border-border rounded px-2 py-1 hover:text-foreground hover:border-foreground/30 transition-colors"
    >
      {store.autoScroll ? "Pause scroll" : "Resume scroll"}
    </button>
    <button
      onClick={sendStop}
      className="text-[11px] text-muted border border-border rounded px-2 py-1 hover:text-foreground hover:border-foreground/30 transition-colors"
    >
      Stop
    </button>
  </div>
</div>
```

Full updated session page:

```tsx
/* frontend/app/session/[id]/page.tsx */
"use client";
import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { useSessionStore } from "@/stores/sessionStore";
import { useSession } from "@/hooks/useSession";
import { PhaseIndicator } from "@/components/debate/PhaseIndicator";
import { MessageCard } from "@/components/debate/MessageCard";
import { ObserverCheckpointCard } from "@/components/debate/ObserverCheckpoint";
import { SourcePanel } from "@/components/debate/SourcePanel";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { RoundSection } from "@/components/debate/RoundSection";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSessionStore();
  const { connect, disconnect, sendStop, connected } = useDebateSocket(id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession(id);

  useEffect(() => {
    store.reset();
    connect();
    return () => disconnect();
  }, [id]);

  useEffect(() => {
    if (session && !store.question) {
      store.setSession(id, session.question);
    }
  }, [session]);

  useEffect(() => {
    if (store.autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [store.messages.length, store.checkpoints.length]);

  useEffect(() => {
    if (store.phase === "completed" && store.finalReport) {
      router.push(`/session/${id}/report`);
    }
  }, [store.phase, store.finalReport]);

  const currentRound = store.messages
    .filter((m) => m.round_number > 0)
    .reduce((max, m) => Math.max(max, m.round_number), 0);

  const allRounds = Array.from(
    new Set(store.messages.map((m) => m.round_number))
  ).sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-sm border-b border-border px-5 py-3 flex items-start gap-4 shrink-0">
        <p className="font-serif italic text-[15px] text-foreground flex-1 truncate leading-snug">
          {store.question}
        </p>
        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          <PhaseIndicator phase={store.phase} round={currentRound} />
          <button
            onClick={() => store.setAutoScroll(!store.autoScroll)}
            className="text-[11px] text-muted border border-border rounded px-2 py-1 hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {store.autoScroll ? "Pause scroll" : "Resume scroll"}
          </button>
          <button
            onClick={sendStop}
            className="text-[11px] text-muted border border-border rounded px-2 py-1 hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {!connected && (
            <ErrorBanner
              message="Connection lost. Attempting to reconnect..."
              onDismiss={() => store.setError("")}
            />
          )}
          {store.error && (
            <ErrorBanner
              message={store.error}
              onDismiss={() => store.setError("")}
            />
          )}
          {allRounds.map((round) => {
            const roundMessages = store.messages.filter((m) => m.round_number === round);
            const checkpoint = store.checkpoints.find((c) => c.round_number === round);
            const label = round === 0 ? "Initial Positions" : `Round ${round}`;
            return (
              <RoundSection key={round} label={label}>
                {roundMessages.map((msg, i) => (
                  <MessageCard key={`${msg.persona_id}-${i}`} message={msg} />
                ))}
                {checkpoint && <ObserverCheckpointCard checkpoint={checkpoint} />}
              </RoundSection>
            );
          })}
          <SourcePanel />
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace ErrorBanner.tsx**

```tsx
/* frontend/components/ui/ErrorBanner.tsx */
type Props = {
  message: string;
  onDismiss?: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg px-4 py-3 flex items-start gap-3">
      <span className="text-foreground text-[13px] flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted hover:text-foreground text-[12px] shrink-0 transition-colors"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

```bash
cd frontend && pnpm vitest run
```

Expected: all tests PASS. (Session page and ErrorBanner have no unit tests — behavioral integrity verified by unchanged logic.)

- [ ] **Step 4: Commit**

```bash
git add frontend/app/session/[id]/page.tsx frontend/components/ui/ErrorBanner.tsx
git commit -m "feat: add Lora italic question header to session page and restyle ErrorBanner"
```

---

## Final Verification

- [ ] **Run full build**

```bash
cd frontend && pnpm build
```

Expected: no TypeScript errors, no missing Tailwind classes, build completes.

- [ ] **Run full test suite**

```bash
cd frontend && pnpm vitest run
```

Expected: all tests PASS.

- [ ] **Manual smoke check (start dev server)**

```bash
cd frontend && pnpm dev
```

Verify:
1. App loads in dark mode (Sidebar warm near-black, `bg-surface` `#141411`).
2. Click theme toggle ☾ → page switches to light mode (warm off-white `#f7f7f5`); page reload preserves choice.
3. Home page shows centered title + subtitle + input card.
4. Create a session → sticky header shows question in italic serif.
5. Debate bubbles have visible 2px left border in distinct warm-gray shades per persona.
6. Round labels show hairline rule extending to the right.
7. Observer checkpoint has no left border, different surface.
