# DissentLab — Scholar's Notebook Visual Design

**Date:** 2026-06-26  
**Status:** Approved  
**Scope:** Full visual refresh — tokens, typography, shell, all debate components, home page  

---

## Overview

DissentLab is an AI council debate tool. Users submit a question; multiple AI personas (Optimist, Pessimist, Contrarian, Observer) argue across rounds. The product is for researchers and intellectually curious users who want structured multi-voice analysis.

The design direction is **Scholar's Notebook**: a warm-gray dual-mode system where the session question is displayed in Lora italic (the only serif moment in the app), framing each debate as a thesis under examination. Persona voices are differentiated by 2px left-border stripes — distinct warm-gray values, no background-color variation.

**Signature element:** The Lora italic question in the session header. One serif line, restrained, before the first word of debate.

---

## Token System

### Colors

Both modes use a warm gray palette (slightly amber-shifted, not neutral cool gray).

```css
/* Light mode (default) */
--bg:             #f7f7f5;
--surface:        #eeebe6;
--surface-raised: #ffffff;
--border:         #dedad5;
--text:           #1a1817;
--text-dim:       #8a857e;

/* Dark mode (.dark class on <html>) */
--bg:             #0d0d0b;
--surface:        #141411;
--surface-raised: #1c1c19;
--border:         #2a2a26;
--text:           #e8e4de;
--text-dim:       #6b6560;
```

### Persona Voice Stripes

Used as `border-l-2` on debate bubbles. Four distinct warm-gray values readable in both modes:

| Persona     | Hex      | Description       |
|-------------|----------|-------------------|
| optimist    | `#9b8f82` | mid warm gray     |
| pessimist   | `#5f5550` | dark warm gray    |
| contrarian  | `#b5a99b` | light warm gray   |
| observer    | `#c8bdb0` | lightest warm gray|

The Observer checkpoint does not use a stripe — it has a distinct structural treatment instead.

### Typography

| Role                    | Font        | Size  | Weight | Notes                       |
|-------------------------|-------------|-------|--------|-----------------------------|
| Session question thesis | Lora italic | 15px  | 400    | Only serif in the app       |
| Persona name            | Inter       | 13px  | 600    | —                           |
| Message body            | Inter       | 14px  | 400    | 1.65 line-height            |
| Round section label     | Inter       | 10px  | 500    | uppercase, 0.08em tracking  |
| Metadata                | Inter       | 11px  | 400    | text-dim                    |
| Sidebar wordmark        | Inter       | 13px  | 700    | −0.01em letter-spacing      |
| UI controls / nav       | Inter       | 12px  | 400    | text-dim                    |
| Home page title         | Inter       | 18px  | 700    | centered                    |

Lora loaded via `next/font/google`. Used only in the session sticky header for the question text.

---

## Layout & Shell

### Overall structure

```
<html class="dark | light">
  <body class="flex h-screen overflow-hidden bg-bg text-text">
    <Sidebar />                 <!-- 240px, bg-surface, border-r -->
    <div class="flex-1 h-screen overflow-y-auto">
      {children}
    </div>
  </body>
```

### Sidebar (240px)

- `bg-surface`, `border-r border-border`, full height, `flex flex-col`
- **Header row:** "DissentLab" Inter 700 13px −0.01em, theme toggle (☾/☀) right-aligned, `px-4 py-4`
- **New debate link:** `+ New debate`, `text-[13px] text-dim hover:text-text`, `px-4 py-2`
- **Session list:** Label "RECENT" 10px uppercase `text-dim` `px-4 py-1`. Each session item: `text-[13px] truncate rounded-md px-4 py-2 mx-2`, active: `bg-surface-raised text-text`, inactive: `text-dim hover:text-text hover:bg-surface-raised`
- **Footer:** `border-t border-border py-2`. Models · Personas · History links, 12px `text-dim hover:text-text`

### Theme Toggle

- 28px button in sidebar header, right side
- ☾ = currently dark (clicking switches to light), ☀ = currently light (clicking switches to dark)
- On mount: reads `localStorage.getItem('theme')`, falls back to system preference (`prefers-color-scheme`)
- Sets/removes `dark` class on `document.documentElement`
- Stores choice in `localStorage` as `'dark'` | `'light'`

---

## Pages

### Home Page (`/`)

Centered empty-state layout. No bottom-anchored BottomBar.

```
flex flex-col h-full items-center justify-center gap-6 px-4
  ├── Title: "DissentLab" Inter 700 18px centered
  ├── Subtitle: "Put a hard question to the council." 14px text-dim centered
  └── Input card: bg-surface-raised rounded-2xl shadow-sm (light) / border border-border (dark)
        ├── Textarea: auto-expand, no resize, placeholder "What should we do about…"
        └── Controls row: [Quick] [Standard] [Deep Dive] pills | [Provider ▾] [Model ▾] | [Start debate →]
```

**Input card internals:**
- `px-5 pt-4 pb-3 space-y-3`
- Textarea: `text-[14px] leading-relaxed resize-none min-h-[80px] bg-transparent outline-none w-full`
- Intensity pills: `text-[12px] px-2.5 py-1 rounded-md`. Active: `bg-surface text-text`, inactive: `text-dim hover:text-text`
- Submit button: `bg-text text-bg text-[13px] font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-40`
- Button label: "Start debate →" (not "Start Council →")

Model setup onboarding card displays inside the input area when no model is configured.

### Session Page (`/session/[id]`)

```
flex flex-col h-full
  ├── Sticky header (bg-surface/80 backdrop-blur-sm border-b)
  └── Scrollable body: max-w-2xl mx-auto px-4 py-6 space-y-6
        ├── ErrorBanner (if any)
        ├── RoundSection × N
        │     ├── MessageCard × M
        │     └── ObserverCheckpointCard (if present)
        └── SourcePanel
```

---

## Components

### Session Sticky Header

```
px-5 py-3 flex items-start gap-4
  ├── Question (flex-1): Lora italic 15px text-text, truncate single line
  └── Right side (shrink-0 flex items-center gap-3):
        ├── "Deliberating · Round 2" (or phase label) 11px text-dim
        ├── Scroll toggle button: 11px text-dim border border-border rounded px-2 py-1
        └── Stop button: same style
```

Phase label mapping:
- `opening` → "Opening"
- `deliberating` → "Deliberating"  
- `closing` → "Closing"
- `completed` → "Concluded"

### MessageCard

```
border-l-2 [persona-stripe-color] bg-surface-raised rounded-lg pl-4 pr-4 py-3
  ├── Header row: flex items-center gap-2.5
  │     ├── Avatar: w-[22px] h-[22px] rounded-full bg-surface flex items-center justify-center
  │     │           text-[10px] font-semibold text-dim
  │     ├── Name: text-[13px] font-semibold text-text
  │     ├── Spacer (flex-1)
  │     └── Metadata: "Round N · Confidence" text-[11px] text-dim
  ├── Body: text-[14px] leading-[1.65] text-text/90 whitespace-pre-wrap mt-2 ml-[calc(22px+10px)]
  └── Sources (if any): mt-1.5 ml-[calc(22px+10px)] flex flex-wrap gap-1
        └── Each source: text-[11px] text-dim border border-border rounded px-1.5 py-0.5
```

Stripe colors applied via inline style or Tailwind arbitrary values:
- `optimist` → `border-l-[#9b8f82]`
- `pessimist` → `border-l-[#5f5550]`
- `contrarian` → `border-l-[#b5a99b]`
- `observer` (debate messages) → `border-l-[#c8bdb0]`

### RoundSection

```
<section>
  <button class="flex items-center gap-3 py-3 w-full text-left select-none group">
    <span class="text-[10px] font-medium uppercase tracking-[0.08em] text-dim whitespace-nowrap">
      {label}
    </span>
    <span class="flex-1 border-t border-border mt-px" />   ← hairline rule
  </button>
  {!collapsed && <div class="space-y-3">{children}</div>}
</section>
```

No chevron icon. The label itself acts as the toggle trigger.

### ObserverCheckpoint

Different structure — synthesis, not debate:

```
bg-surface rounded-lg px-5 py-4 space-y-3
  ├── Label row: "OBSERVER" text-[10px] uppercase tracking-[0.08em] text-dim
  │              + thin border-b border-border pb-2
  ├── Summary text: text-[14px] leading-[1.65] text-text/90
  └── Consensus bar (if consensus_score present):
        flex items-center gap-3
          ├── Label: "Consensus" text-[11px] text-dim
          ├── Track: flex-1 h-[2px] bg-border rounded-full
          │          └── Fill: h-full bg-text-dim rounded-full (width = consensus_score%)
          └── Value: text-[11px] text-dim "N%"
```

### ErrorBanner

```
bg-surface-raised border border-border rounded-lg px-4 py-3 flex items-start gap-3 text-[13px]
  ├── Message text (flex-1) text-text
  └── Dismiss ×: text-dim hover:text-text
```

---

## Tailwind Config Changes

Replace all hardcoded hex values with CSS var references:

```ts
colors: {
  // These aliases preserve existing class names (bg-background, text-foreground, etc.)
  background:        'var(--bg)',
  foreground:        'var(--text)',
  // New aliases
  surface:           'var(--surface)',
  'surface-raised':  'var(--surface-raised)',
  border:            'var(--border)',
  muted:             'var(--text-dim)',
  // Persona stripes — fixed warm-gray values, intentionally identical in both modes
  'stripe-optimist':   '#9b8f82',
  'stripe-pessimist':  '#5f5550',
  'stripe-contrarian': '#b5a99b',
  'stripe-observer':   '#c8bdb0',
}
```

Remove: `card`, `sidebar`, `accent`, `checkpoint`, `optimist`, `pessimist`, `contrarian`, `observer` (old), `bubble-1` through `bubble-4`.

---

## Files to Change

| File | Change |
|------|--------|
| `app/globals.css` | Add CSS custom properties for both modes; add `.dark` class overrides |
| `tailwind.config.ts` | Replace token values with CSS var refs; add stripe tokens |
| `app/layout.tsx` | Import Lora via `next/font/google`; add theme provider logic |
| `app/providers.tsx` | Add ThemeProvider (or inline in layout) |
| `app/page.tsx` | Centered home layout replacing BottomBar-at-bottom |
| `components/layout/Sidebar.tsx` | New styles + theme toggle button |
| `components/layout/BottomBar.tsx` | Card style; rename "Start Council" → "Start debate" |
| `components/debate/MessageCard.tsx` | Stripe approach; new avatar/header row |
| `components/debate/RoundSection.tsx` | Hairline rule label; remove chevron |
| `components/debate/ObserverCheckpoint.tsx` | New structural treatment |
| `components/ui/ErrorBanner.tsx` | Warm-gray styling |
| `app/session/[id]/page.tsx` | Session header with Lora question |
| `lib/utils.ts` | Update `getPersonaStyle` to return stripe color instead of bubble bg |

---

## Decisions Not Made Here

- Mobile / responsive breakpoints for the sidebar (collapse to drawer on small screens) — out of scope for this pass
- Animation / transition details — subtle `transition-colors duration-150` on interactive elements is sufficient; no orchestrated motion needed for this direction
- Lora font weight variants — only regular 400 italic is needed; no need to load additional weights
