# Monochrome Claude-Style UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the DissentLab frontend to match Claude's chat shell (left sidebar, bubble feed, bottom input bar) in a strict monochrome color scheme.

**Architecture:** Replace the current top-nav layout with a two-column flex shell (260px fixed sidebar + scrollable main). The home page moves all controls to a sticky bottom bar. The session page converts border-left message cards to rounded persona bubbles with avatar initials and wraps rounds in collapsible sections.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Vitest, React Testing Library

## Global Constraints

- All work is in `frontend/` — no backend changes
- Run tests with: `cd frontend && npm run test`
- Test runner: Vitest + React Testing Library (`@testing-library/react`)
- Tailwind class names must reference tokens defined in `tailwind.config.ts` — never hardcode hex values in JSX
- Never use `any` type
- Keep existing component prop interfaces unless a task explicitly changes them
- Commit at the end of each task

---

### Task 1: Color Tokens

**Files:**
- Modify: `frontend/tailwind.config.ts`

**Interfaces:**
- Produces: Tailwind utility classes `bg-sidebar`, `bg-bubble-1`, `bg-bubble-2`, `bg-bubble-3`, `bg-bubble-4`, `bg-checkpoint`, updated `accent`, `optimist`, `pessimist`, `contrarian`, `observer`

- [ ] **Step 1: Update `tailwind.config.ts`**

Replace the `colors` block with:

```ts
colors: {
  background: "#0a0a0a",
  foreground: "#f5f5f5",
  card: "#141414",
  border: "#262626",
  muted: "#737373",
  sidebar: "#111111",
  accent: "#d4d4d4",
  checkpoint: "#1f1f1f",
  optimist: "#4a4a4a",
  pessimist: "#616161",
  contrarian: "#787878",
  observer: "#4f4f4f",
  "bubble-1": "#181818",
  "bubble-2": "#1e1e1e",
  "bubble-3": "#232323",
  "bubble-4": "#282828",
},
```

- [ ] **Step 2: Verify build compiles**

```bash
cd frontend && npm run build
```

Expected: build succeeds (existing accent/persona usages will look different but compile fine — visual fixes come in later tasks).

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.ts
git commit -m "feat: update color tokens to monochrome palette"
```

---

### Task 2: Replace `getPersonaColor` with `getPersonaStyle`

Updates the utility that maps persona IDs to styling classes. Also updates `SourcePanel.tsx`, which is the only other consumer of `getPersonaColor`.

**Files:**
- Modify: `frontend/lib/utils.ts`
- Modify: `frontend/components/debate/SourcePanel.tsx`
- Create: `frontend/tests/lib/utils.test.ts`

**Interfaces:**
- Produces: `getPersonaStyle(personaId: string): PersonaStyle` where `PersonaStyle = { bubbleBg: string; avatarBg: string }`
- `getPersonaColor` is removed; downstream components are updated in this task (SourcePanel) and later tasks (MessageCard in Task 5)

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/lib/utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getPersonaStyle } from "@/lib/utils";

describe("getPersonaStyle", () => {
  it("returns correct style for optimist", () => {
    const s = getPersonaStyle("optimist");
    expect(s.bubbleBg).toBe("bg-bubble-1");
    expect(s.avatarBg).toBe("bg-optimist");
  });

  it("returns correct style for pessimist", () => {
    const s = getPersonaStyle("pessimist");
    expect(s.bubbleBg).toBe("bg-bubble-2");
    expect(s.avatarBg).toBe("bg-pessimist");
  });

  it("returns correct style for contrarian", () => {
    const s = getPersonaStyle("contrarian");
    expect(s.bubbleBg).toBe("bg-bubble-3");
    expect(s.avatarBg).toBe("bg-contrarian");
  });

  it("returns correct style for observer", () => {
    const s = getPersonaStyle("observer");
    expect(s.bubbleBg).toBe("bg-bubble-4");
    expect(s.avatarBg).toBe("bg-observer");
  });

  it("returns fallback style for unknown persona", () => {
    const s = getPersonaStyle("unknown-id");
    expect(s.bubbleBg).toBe("bg-bubble-1");
    expect(s.avatarBg).toBe("bg-optimist");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm run test -- tests/lib/utils.test.ts
```

Expected: FAIL — `getPersonaStyle is not a function` (or similar import error).

- [ ] **Step 3: Update `frontend/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PersonaStyle = {
  bubbleBg: string;
  avatarBg: string;
};

const PERSONA_STYLES: Record<string, PersonaStyle> = {
  optimist:   { bubbleBg: "bg-bubble-1", avatarBg: "bg-optimist" },
  pessimist:  { bubbleBg: "bg-bubble-2", avatarBg: "bg-pessimist" },
  contrarian: { bubbleBg: "bg-bubble-3", avatarBg: "bg-contrarian" },
  observer:   { bubbleBg: "bg-bubble-4", avatarBg: "bg-observer" },
};

const FALLBACK: PersonaStyle = { bubbleBg: "bg-bubble-1", avatarBg: "bg-optimist" };

export function getPersonaStyle(personaId: string): PersonaStyle {
  return PERSONA_STYLES[personaId] ?? FALLBACK;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm run test -- tests/lib/utils.test.ts
```

Expected: 5 PASS.

- [ ] **Step 5: Update `frontend/components/debate/SourcePanel.tsx`**

Remove the `getPersonaColor` import and replace the persona label span. The full updated file:

```tsx
"use client";
import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";

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
                <span className="text-xs text-muted">{src.persona_id}</span>
              </div>
              <div className="text-xs text-muted">{src.domain}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run all tests**

```bash
cd frontend && npm run test
```

Expected: all existing tests still pass (SourcePanel test doesn't assert on color classes).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/utils.ts frontend/components/debate/SourcePanel.tsx frontend/tests/lib/utils.test.ts
git commit -m "feat: replace getPersonaColor with getPersonaStyle for monochrome persona tokens"
```

---

### Task 3: Sidebar + Shell Layout

Creates the left sidebar and rewires `layout.tsx` from a top-nav to a two-column flex shell.

**Files:**
- Create: `frontend/components/layout/Sidebar.tsx`
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/tests/components/layout/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useSessionList` from `@/hooks/useSession`, `usePathname` from `next/navigation`, `cn` from `@/lib/utils`
- Produces: `<Sidebar />` — no props

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/components/layout/Sidebar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/hooks/useSession", () => ({
  useSessionList: () => ({
    data: [
      { id: "abc", question: "Is AI safe?", created_at: "", debate_intensity: "standard" },
    ],
  }),
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Sidebar", () => {
  it("renders DissentLab wordmark", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("DissentLab")).toBeDefined();
  });

  it("renders New Session link", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("+ New Session")).toBeDefined();
  });

  it("renders nav links", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("Models")).toBeDefined();
    expect(screen.getByText("Personas")).toBeDefined();
    expect(screen.getByText("History")).toBeDefined();
  });

  it("renders session question in list", () => {
    wrap(<Sidebar />);
    expect(screen.getByText("Is AI safe?")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm run test -- tests/components/layout/Sidebar.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/layout/Sidebar'`.

- [ ] **Step 3: Create `frontend/components/layout/Sidebar.tsx`**

```tsx
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
```

- [ ] **Step 4: Run Sidebar tests to verify they pass**

```bash
cd frontend && npm run test -- tests/components/layout/Sidebar.test.tsx
```

Expected: 4 PASS.

- [ ] **Step 5: Update `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "DissentLab",
  description: "AI council research and debate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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

- [ ] **Step 6: Run all tests**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/layout/Sidebar.tsx frontend/app/layout.tsx frontend/tests/components/layout/Sidebar.test.tsx
git commit -m "feat: add Sidebar and replace top nav with two-column shell layout"
```

---

### Task 4: BottomBar + Home Page

Creates the bottom input bar and refactors the home page to use it. The recent sessions list is removed from the home page (already in the sidebar).

**Files:**
- Create: `frontend/components/layout/BottomBar.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `QuestionForm`, `IntensitySelector`, `ModelSelector` (existing components, unchanged)
- Produces: `<BottomBar>` with props for question, intensity, model, and callbacks

- [ ] **Step 1: Create `frontend/components/layout/BottomBar.tsx`**

No test written first for this component — it is a thin composition of already-tested child components. A smoke render test would only duplicate the child tests.

```tsx
"use client";
import { QuestionForm } from "@/components/session/QuestionForm";
import { IntensitySelector } from "@/components/session/IntensitySelector";
import { ModelSelector } from "@/components/session/ModelSelector";

type Intensity = "quick" | "standard" | "deep_dive";

type BottomBarProps = {
  question: string;
  onQuestionChange: (v: string) => void;
  intensity: Intensity;
  onIntensityChange: (v: Intensity) => void;
  provider: string;
  onProviderChange: (v: string) => void;
  model: string;
  onModelChange: (v: string) => void;
  onStart: () => void;
  loading: boolean;
};

export function BottomBar({
  question,
  onQuestionChange,
  intensity,
  onIntensityChange,
  provider,
  onProviderChange,
  model,
  onModelChange,
  onStart,
  loading,
}: BottomBarProps) {
  return (
    <div className="border-t border-border bg-sidebar px-4 py-3 space-y-3 shrink-0">
      <QuestionForm value={question} onChange={onQuestionChange} />
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <IntensitySelector value={intensity} onChange={onIntensityChange} />
          <ModelSelector
            provider={provider}
            model={model}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
          />
        </div>
        <button
          onClick={onStart}
          disabled={!question.trim() || loading}
          className="shrink-0 mt-1 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Starting…" : "Start Council →"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `frontend/app/page.tsx`**

Remove the `<h1>`, subtitle, recent sessions section, and inline controls. The full updated file:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { BottomBar } from "@/components/layout/BottomBar";
import { useModels } from "@/hooks/useModels";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const { defaultIntensity, defaultProvider, defaultModel, setDefaultIntensity, setDefaultProvider, setDefaultModel } =
    useSettingsStore();
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
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-4">
        {showOnboarding && <ModelSetupCard />}
      </div>
      <BottomBar
        question={question}
        onQuestionChange={setQuestion}
        intensity={defaultIntensity}
        onIntensityChange={setDefaultIntensity}
        provider={defaultProvider}
        onProviderChange={setDefaultProvider}
        model={defaultModel}
        onModelChange={setDefaultModel}
        onStart={handleStart}
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/layout/BottomBar.tsx frontend/app/page.tsx
git commit -m "feat: add BottomBar and refactor home page to Claude-style shell"
```

---

### Task 5: MessageCard Bubble Redesign

Converts the border-left card to a rounded bubble with an avatar circle.

**Files:**
- Modify: `frontend/components/debate/MessageCard.tsx`
- Modify: `frontend/tests/components/debate/MessageCard.test.tsx`

**Interfaces:**
- Consumes: `getPersonaStyle(personaId: string): PersonaStyle` from `@/lib/utils` (defined in Task 2)
- Prop interface `{ message: DebateMessage }` is unchanged

- [ ] **Step 1: Add avatar initials test to existing test file**

In `frontend/tests/components/debate/MessageCard.test.tsx`, add this test inside the `describe` block:

```tsx
it("renders avatar initials from persona name", () => {
  render(<MessageCard message={baseMessage} />);
  expect(screen.getByText("OP")).toBeDefined(); // "Optimist".slice(0, 2).toUpperCase()
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm run test -- tests/components/debate/MessageCard.test.tsx
```

Expected: the new "avatar initials" test FAILs; existing 7 tests PASS.

- [ ] **Step 3: Rewrite `frontend/components/debate/MessageCard.tsx`**

```tsx
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
```

- [ ] **Step 4: Run MessageCard tests to verify all pass**

```bash
cd frontend && npm run test -- tests/components/debate/MessageCard.test.tsx
```

Expected: 8 PASS (7 original + 1 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/debate/MessageCard.tsx frontend/tests/components/debate/MessageCard.test.tsx
git commit -m "feat: convert MessageCard to bubble style with persona avatar initials"
```

---

### Task 6: ObserverCheckpoint — Monochrome + Progress Bar

Removes the `observer` color tint, replaces the text consensus display with a progress bar, and removes the red color from disagreements.

**Files:**
- Modify: `frontend/components/debate/ObserverCheckpoint.tsx`
- Modify: `frontend/tests/components/debate/ObserverCheckpoint.test.tsx`

**Interfaces:**
- Prop interface `{ checkpoint: ObserverCheckpoint }` is unchanged

- [ ] **Step 1: Update the consensus percentage test**

In `frontend/tests/components/debate/ObserverCheckpoint.test.tsx`, replace the `"renders consensus percentage"` test:

```tsx
// Replace:
it("renders consensus percentage", () => {
  render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
  expect(screen.getByText("Consensus: 65%")).toBeDefined();
});

// With:
it("renders consensus percentage", () => {
  render(<ObserverCheckpointCard checkpoint={baseCheckpoint} />);
  expect(screen.getByText("65%")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm run test -- tests/components/debate/ObserverCheckpoint.test.tsx
```

Expected: `"renders consensus percentage"` FAILs (still renders "Consensus: 65%"); all others PASS.

- [ ] **Step 3: Rewrite `frontend/components/debate/ObserverCheckpoint.tsx`**

```tsx
import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensus = Math.round(checkpoint.consensus_score * 100);

  return (
    <div className="border border-border rounded-xl p-4 bg-checkpoint space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Observer — Round {checkpoint.round_number}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-1 bg-accent rounded-full"
              style={{ width: `${consensus}%` }}
            />
          </div>
          <span className="text-xs text-muted">{consensus}%</span>
        </div>
      </div>

      {checkpoint.agreements.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-1">Agreements</div>
          <ul className="space-y-0.5">
            {checkpoint.agreements.map((a, i) => (
              <li key={i} className="text-sm text-foreground/80">· {a}</li>
            ))}
          </ul>
        </div>
      )}

      {checkpoint.disagreements.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-1">Disagreements</div>
          <ul className="space-y-0.5">
            {checkpoint.disagreements.map((d, i) => (
              <li key={i} className="text-sm text-foreground/80">· {d}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted italic">{checkpoint.reason}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run ObserverCheckpoint tests to verify all pass**

```bash
cd frontend && npm run test -- tests/components/debate/ObserverCheckpoint.test.tsx
```

Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/debate/ObserverCheckpoint.tsx frontend/tests/components/debate/ObserverCheckpoint.test.tsx
git commit -m "feat: convert ObserverCheckpoint to monochrome with consensus progress bar"
```

---

### Task 7: Monochrome Cleanup (PhaseIndicator, History, IntensitySelector)

Sweeps the remaining files that use semantic colors (`text-accent`, `text-contrarian`, `text-optimist`, `text-pessimist`) and replaces them with monochrome equivalents.

**Files:**
- Modify: `frontend/components/debate/PhaseIndicator.tsx`
- Modify: `frontend/tests/components/debate/PhaseIndicator.test.tsx`
- Modify: `frontend/app/history/page.tsx`
- Modify: `frontend/components/session/IntensitySelector.tsx`

**Interfaces:** All external interfaces unchanged.

- [ ] **Step 1: Update the PhaseIndicator accent-class test**

In `frontend/tests/components/debate/PhaseIndicator.test.tsx`, update the `"applies accent class to active phases"` test:

```tsx
// Replace:
it("applies accent class to active phases", () => {
  render(<PhaseIndicator phase="positions" round={0} />);
  const researching = screen.getByText("Researching");
  const initialPositions = screen.getByText("Initial Positions");
  expect(researching.className).toContain("text-accent");
  expect(initialPositions.className).toContain("text-accent");
});

// With:
it("applies foreground class to active phases", () => {
  render(<PhaseIndicator phase="positions" round={0} />);
  const researching = screen.getByText("Researching");
  const initialPositions = screen.getByText("Initial Positions");
  expect(researching.className).toContain("text-foreground");
  expect(initialPositions.className).toContain("text-foreground");
});
```

- [ ] **Step 2: Run PhaseIndicator test to verify it fails**

```bash
cd frontend && npm run test -- tests/components/debate/PhaseIndicator.test.tsx
```

Expected: the updated test FAILs (still has `text-accent`).

- [ ] **Step 3: Update `frontend/components/debate/PhaseIndicator.tsx`**

Change the active phase class from `text-accent` to `text-foreground`:

```tsx
type Phase = "idle" | "researching" | "positions" | "debating" | "final" | "completed" | "error";

const PHASES: { key: Phase; label: string }[] = [
  { key: "researching", label: "Researching" },
  { key: "positions", label: "Initial Positions" },
  { key: "debating", label: "Debate" },
  { key: "completed", label: "Final Report" },
];

export function PhaseIndicator({ phase, round }: { phase: Phase; round: number }) {
  const activeIndex = PHASES.findIndex((p) => p.key === phase);
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      {PHASES.map((p, i) => (
        <span key={p.key} className="flex items-center gap-2">
          <span className={i <= activeIndex ? "text-foreground font-medium" : ""}>
            {p.key === "debating" && round > 0 ? `Round ${round}` : p.label}
          </span>
          {i < PHASES.length - 1 && <span className="text-border">→</span>}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Update `frontend/app/history/page.tsx`**

Replace the `STATUS_COLORS` map with monochrome values (remove `text-optimist`, `text-contrarian`, `text-pessimist`):

```tsx
const STATUS_COLORS: Record<string, string> = {
  completed: "text-foreground",
  running:   "text-accent",
  error:     "text-muted",
  pending:   "text-muted",
};
```

Also remove the "Delete" button's `hover:text-pessimist` hover class:

```tsx
// Replace:
className="text-xs text-muted hover:text-pessimist transition-colors shrink-0"
// With:
className="text-xs text-muted hover:text-foreground transition-colors shrink-0"
```

- [ ] **Step 5: Update `frontend/components/session/IntensitySelector.tsx`**

Remove the `text-contrarian` deep-dive warning — replace with `text-muted`:

```tsx
// Replace:
<p className="text-xs text-contrarian mt-2">
// With:
<p className="text-xs text-muted mt-2">
```

Also update the active button state from `text-accent` / `bg-accent/10` / `border-accent` to monochrome:

```tsx
// Replace:
value === opt.value
  ? "border-accent bg-accent/10 text-accent"
  : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
// With:
value === opt.value
  ? "border-foreground bg-foreground/10 text-foreground"
  : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
```

- [ ] **Step 6: Run all tests**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/debate/PhaseIndicator.tsx \
        frontend/tests/components/debate/PhaseIndicator.test.tsx \
        frontend/app/history/page.tsx \
        frontend/components/session/IntensitySelector.tsx
git commit -m "feat: replace semantic colors with monochrome across PhaseIndicator, history, and IntensitySelector"
```

---

### Task 8: RoundSection + Session Page

Creates the collapsible round wrapper and refactors the session page to use it, adds the sticky top bar, and removes the now-redundant question display block.

**Files:**
- Create: `frontend/components/debate/RoundSection.tsx`
- Modify: `frontend/app/session/[id]/page.tsx`
- Create: `frontend/tests/components/debate/RoundSection.test.tsx`

**Interfaces:**
- Produces: `<RoundSection label={string}>` — collapses/expands its children
- Session page root element changes from `<main>` to `<div className="flex flex-col h-full">`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/components/debate/RoundSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoundSection } from "@/components/debate/RoundSection";

describe("RoundSection", () => {
  it("renders the label", () => {
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    expect(screen.getByText("Round 1")).toBeDefined();
  });

  it("shows children by default", () => {
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    expect(screen.getByText("content")).toBeDefined();
  });

  it("hides children after clicking the header button", async () => {
    const user = userEvent.setup();
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("content")).toBeNull();
  });

  it("shows children again after a second click", async () => {
    const user = userEvent.setup();
    render(<RoundSection label="Round 1"><p>content</p></RoundSection>);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("content")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm run test -- tests/components/debate/RoundSection.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/debate/RoundSection'`.

- [ ] **Step 3: Create `frontend/components/debate/RoundSection.tsx`**

```tsx
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
```

- [ ] **Step 4: Run RoundSection tests to verify they pass**

```bash
cd frontend && npm run test -- tests/components/debate/RoundSection.test.tsx
```

Expected: 4 PASS.

- [ ] **Step 5: Rewrite `frontend/app/session/[id]/page.tsx`**

```tsx
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
      <div className="sticky top-0 z-10 bg-sidebar border-b border-border px-4 py-3 flex items-center gap-4 shrink-0">
        <p className="text-sm text-foreground flex-1 truncate">{store.question}</p>
        <PhaseIndicator phase={store.phase} round={currentRound} />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => store.setAutoScroll(!store.autoScroll)}
            className="text-xs text-muted border border-border rounded px-2 py-1 hover:border-foreground/30 transition-colors"
          >
            {store.autoScroll ? "Pause scroll" : "Resume scroll"}
          </button>
          <button
            onClick={sendStop}
            className="text-xs text-muted border border-border rounded px-2 py-1 hover:border-foreground/30 transition-colors"
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

- [ ] **Step 6: Run all tests**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/debate/RoundSection.tsx \
        frontend/app/session/[id]/page.tsx \
        frontend/tests/components/debate/RoundSection.test.tsx
git commit -m "feat: add collapsible RoundSection and refactor session page to bubble chat layout"
```
