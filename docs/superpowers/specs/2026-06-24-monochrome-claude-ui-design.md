# Monochrome Claude-Style UI Redesign

**Date:** 2026-06-24  
**Status:** Approved  

## Overview

Redesign the DissentLab frontend to adopt Claude's chatbot shell — left sidebar, scrollable bubble-chat feed, and a bottom bar for session controls — in a strict monochrome (black, white, and all shades of gray) color scheme. No structural changes to the backend or API.

## Goals

- Replace the current top-nav + border-left card layout with a Claude-style three-panel shell
- Convert persona messages from flat border-left cards to rounded bubbles with avatar initials
- Replace all accent and persona colors (indigo, green, red, amber) with a grayscale token system
- Make rounds collapsible/expandable like Claude's thinking process, expanded by default
- Add a left sidebar with session history and nav links
- Add a bottom bar on the home page for session controls

## Out of Scope

- Backend, API, or data model changes
- Report page structural redesign (inherits shell + token changes only)
- Mobile/responsive layout (not addressed in this iteration)
- Light mode

---

## 1. Color Token System

All changes land in `frontend/tailwind.config.ts`.

### Global tokens (unchanged)

| Token | Value | Role |
|---|---|---|
| `background` | `#0a0a0a` | Page background |
| `foreground` | `#f5f5f5` | Primary text |
| `card` | `#141414` | Card/surface background |
| `border` | `#262626` | Borders and dividers |
| `muted` | `#737373` | Secondary/dimmed text |

### Changed tokens

| Token | Old | New | Role |
|---|---|---|---|
| `accent` | `#6366f1` (indigo) | `#d4d4d4` | Interactive highlights, active state, hover text |
| `optimist` | `#22c55e` (green) | `#4a4a4a` | Persona 1 avatar background |
| `pessimist` | `#ef4444` (red) | `#616161` | Persona 2 avatar background |
| `contrarian` | `#f59e0b` (amber) | `#787878` | Persona 3 avatar background |
| `observer` | `#6366f1` (indigo) | `#4f4f4f` | Persona 4 avatar background |

### New tokens

| Token | Value | Role |
|---|---|---|
| `sidebar` | `#111111` | Sidebar and bottom bar surface |
| `bubble-1` | `#181818` | Optimist bubble background |
| `bubble-2` | `#1e1e1e` | Pessimist bubble background |
| `bubble-3` | `#232323` | Contrarian bubble background |
| `bubble-4` | `#282828` | Observer bubble background |
| `checkpoint` | `#1f1f1f` | Observer checkpoint card background |

Persona avatar circles carry the primary visual distinction between personas. Bubble backgrounds provide a subtle secondary reinforcement.

---

## 2. Shell Layout

`frontend/app/layout.tsx` is replaced with a two-column flex layout. The `<nav>` top bar is removed entirely.

```
┌──────────────┬──────────────────────────────────────┐
│   Sidebar    │           Main Content               │
│   260px      │           flex-1                     │
│   fixed      │           overflow-y-auto            │
└──────────────┴──────────────────────────────────────┘
```

### Sidebar (`components/layout/Sidebar.tsx`)

- Background: `sidebar` (`#111111`)
- Right border: `1px solid border` (`#262626`)
- Width: `260px`, fixed height `100vh`, `overflow-y-auto`

Structure (top to bottom):

1. **Wordmark** — "DissentLab" in `text-sm font-semibold text-foreground`, `px-4 py-4`
2. **New Session button** — `+ New` text button, `text-sm text-muted hover:text-foreground`, `px-4 py-2`
3. **Session list** — recent sessions from the existing `/api/sessions` endpoint, each row is `px-4 py-2 rounded-md hover:bg-card text-sm text-muted hover:text-foreground`. Active session gets `bg-card text-foreground`.
4. **Divider** — `border-t border-border mx-4`
5. **Nav links** — Models, Personas, History — `text-sm text-muted hover:text-foreground px-4 py-2`

### Main content area

`flex-1`, `overflow-y-auto`, `relative`. Page components render here. No padding at the shell level — each page owns its own padding.

---

## 3. Home Page

`frontend/app/page.tsx`

The `<h1>DissentLab</h1>` and the `<p>` subtitle are removed (wordmark is now in the sidebar). The `ModelSetupCard` onboarding banner remains centered in the main area when no model is configured.

The main area is `flex flex-col h-full`:
- Top section: `flex-1` — empty or shows `ModelSetupCard` centered
- Bottom bar: `0px` flex-shrink — the `BottomBar` component

### Bottom Bar (`components/layout/BottomBar.tsx`)

- Background: `sidebar` (`#111111`)
- Top border: `1px solid border`
- Padding: `px-4 py-3`

Structure:
1. **Question textarea** — full width, `bg-card border border-border rounded-xl px-4 py-3 text-sm`, placeholder "Ask a question…", auto-grows up to ~5 lines
2. **Controls row** (below textarea) — `flex items-center gap-3 mt-2`:
   - `IntensitySelector` (left)
   - `ModelSelector` (left)
   - `Start Council` button (right, `ml-auto`) — `bg-foreground text-background text-sm font-medium px-4 py-2 rounded-lg hover:bg-foreground/90 disabled:opacity-40`

---

## 4. Session Page

`frontend/app/session/[id]/page.tsx`

No bottom bar. Layout is `flex flex-col h-full`:
- **Sticky top bar** — `shrink-0`
- **Scrollable feed** — `flex-1 overflow-y-auto`

### Sticky Top Bar

- Background: `sidebar` (`#111111`)
- Bottom border: `1px solid border`
- Padding: `px-4 py-3`
- Content: question text (truncated, `text-sm text-foreground`), `PhaseIndicator` (right), Stop button (far right)

### Collapsible Round Sections

Each round is a `<section>` with:

- **Header**: `flex items-center gap-2 py-2 cursor-pointer select-none`
  - Chevron icon: `▼` (expanded) / `▶` (collapsed), `text-muted text-xs`
  - Label: `text-xs text-muted uppercase tracking-wider` — "Initial Positions" (round 0) or "Round N"
  - Clicking toggles a local `collapsed` boolean via `useState` on a new `RoundSection` component
- **Body**: messages + observer checkpoint, hidden with `hidden` class when collapsed
- Default state: all expanded

New component: `components/debate/RoundSection.tsx` — wraps the round header + body with collapse state.

### Persona Bubbles (`components/debate/MessageCard.tsx`)

Replace the current border-left card with:

```
┌─────────────────────────────────────┐
│ [XX]  Persona Name   Round N · 0.8  │
│       Message text goes here,       │
│       wrapping naturally…           │
│                                     │
│       [src1] [src2]                 │
└─────────────────────────────────────┘
```

- Container: `rounded-2xl px-4 py-3`, bubble background from `bubble-1..4` per persona
- Avatar circle: `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-foreground`, background from persona color token (`optimist`, `pessimist`, `contrarian`, `observer`). Shows first two letters of persona name uppercased.
- Persona name: `text-sm font-semibold text-foreground`
- Round + confidence: `text-xs text-muted`
- Message body: `text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mt-1`
- Cited sources: unchanged styling, `mt-2`

Bubble background assignment is determined by mapping `persona_id` to a stable index (0–3) using the existing `getPersonaColor` utility in `lib/utils.ts`, which will be updated to return bubble + avatar token class pairs instead of the current color classes.

### Observer Checkpoint (`components/debate/ObserverCheckpoint.tsx`)

- Background: `#1f1f1f` (new `checkpoint` token), thin full-width `border border-border rounded-xl`
- Observer label: `text-xs font-semibold text-foreground uppercase tracking-wider` (no color)
- Consensus score: replaced with a gray progress bar — `bg-border rounded-full h-1` track, `bg-accent rounded-full h-1` fill at `{consensus}%` width, percentage label `text-xs text-muted` to the right
- Agreements/disagreements: `text-foreground/80` and `text-muted` respectively (no red/green)

---

## 5. Remaining Pages

### Report page (`app/session/[id]/report/page.tsx`)

No structural changes. Inherits shell. `ExportButton` uses `border border-border text-foreground hover:bg-card` (outlined, no accent fill). `ReportSection` cards use `bg-card border border-border rounded-xl`.

### History page (`app/history/page.tsx`)

Simple session list rows, same style as sidebar session rows but full-width with more metadata visible. Inherits shell.

### Settings pages (`app/settings/models/page.tsx`, `app/settings/personas/page.tsx`)

No structural changes. Inherits shell. Active nav link in sidebar highlighted.

---

## 6. New Files

| File | Purpose |
|---|---|
| `components/layout/Sidebar.tsx` | Fixed left sidebar: wordmark, new session, session list, nav links |
| `components/layout/BottomBar.tsx` | Home page bottom bar: question textarea + controls row |
| `components/debate/RoundSection.tsx` | Collapsible round wrapper with chevron toggle |

## 7. Modified Files

| File | Change |
|---|---|
| `tailwind.config.ts` | Add/update color tokens per Section 1 |
| `app/layout.tsx` | Replace top nav with two-column shell using `Sidebar` |
| `app/page.tsx` | Remove heading, move controls into `BottomBar`, empty main area |
| `app/session/[id]/page.tsx` | Add sticky top bar, replace round rendering with `RoundSection` |
| `components/debate/MessageCard.tsx` | Border-left card → rounded bubble with avatar circle |
| `components/debate/ObserverCheckpoint.tsx` | Remove color classes, add consensus progress bar |
| `components/debate/PhaseIndicator.tsx` | Replace `text-accent` with `text-foreground`, `text-muted` for inactive |
| `lib/utils.ts` | Update `getPersonaColor` to return bubble bg + avatar token pairs |
