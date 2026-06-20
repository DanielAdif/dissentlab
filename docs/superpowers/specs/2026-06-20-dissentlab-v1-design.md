# DissentLab V1 — System Design Spec

**Date:** 2026-06-20
**Status:** Approved
**Source:** dissentlab_v1_prd.md + brainstorming session

---

## 1. Overview

DissentLab is a local-first AI research and debate application. Users submit a question and watch a council of AI personas (Optimist, Pessimist, Contrarian, Observer) independently research the topic, debate each other live, and converge toward a final synthesized recommendation.

The debate is the primary experience. The final answer is the conclusion of that experience.

---

## 2. Deployment

### 2.1 Runtime

The system runs as a **web application inside Docker**. No desktop wrapper (Tauri is deferred to a future version). The user opens `http://localhost:3000` in their browser.

### 2.2 Docker Compose Stack

Two services:

| Service | Image | Port |
|---|---|---|
| `frontend` | Node (Next.js) | `3000` (host-exposed) |
| `backend` | Python (FastAPI) | `8000` (internal only) |

The frontend proxies all API and WebSocket requests to the backend via Docker's internal network (`http://backend:8000`). The browser only talks to port 3000.

### 2.3 Volumes

| Volume | Contents |
|---|---|
| `dissentlab_db` | SQLite database file |
| `dissentlab_chroma` | Chroma vector store data |
| `dissentlab_models` | HuggingFace model weights (Qwen3-0.6B, ~400MB) |
| `dissentlab_cache` | Downloaded webpage snapshots (24h TTL) |

### 2.4 Configuration

A `.env` file at the repo root configures ports, volume mount paths, and the default Ollama URL. No secrets live in `.env` — all API keys are entered through the UI and encrypted in SQLite.

### 2.5 Developer Workflow

```bash
docker compose up --build   # start everything
```

Hot reload is enabled for both services in development mode (source directories are volume-mounted).

---

## 3. Backend

### 3.1 Stack

- **FastAPI** — HTTP API + WebSocket server
- **LangGraph + LangChain** — agent graph orchestration
- **SQLite** — persistent storage (via `aiosqlite`)
- **Chroma** (embedded, in-process) — source relevance scoring and deduplication
- **sentence-transformers** — embeddings for Chroma (runs in-process, CPU)
- **httpx** — async HTTP for web fetching
- **trafilatura** — HTML-to-text extraction
- **cryptography (Fernet)** — API key encryption
- **huggingface_hub + transformers + torch** — HuggingFace fallback model

### 3.2 Directory Structure

```
/backend
  /api
    sessions.py       → CRUD + WebSocket endpoint
    personas.py       → persona management
    models.py         → provider config, key management, connection test
    settings.py       → app preferences
  /agents
    optimist.py
    pessimist.py
    contrarian.py
    observer.py
    base.py           → shared persona base class
  /graph
    state.py          → CouncilState TypedDict
    nodes.py          → all LangGraph node functions
    graph.py          → graph definition, edges, router
  /models
    gateway.py        → ModelGateway class
    providers/
      openai.py
      anthropic.py
      gemini.py
      moonshot.py
      openrouter.py
      ollama.py
      huggingface.py  → Qwen3-0.6B local inference
  /tools
    search.py         → Tavily search tool
    reader.py         → URL fetcher + trafilatura extractor
    summarizer.py     → webpage summarizer
    citations.py      → citation extractor
  /storage
    db.py             → SQLite connection + migrations
    repositories/
      sessions.py
      personas.py
      sources.py
      messages.py
      checkpoints.py
      reports.py
      settings.py
    chroma_client.py  → Chroma embedded client wrapper
    file_cache.py     → webpage snapshot cache
  /security
    encryption.py     → Fernet key derivation + encrypt/decrypt
  main.py
```

### 3.3 LangGraph State Schema

```python
class Source(TypedDict):
    id: str
    title: str
    url: str
    domain: str
    retrieved_at: str
    summary: str
    discovered_by: str
    relevance_score: float
    claims: List[str]

class PersonaConfig(TypedDict):
    id: str
    name: str
    role: str
    system_prompt: str
    enabled: bool
    model_provider: str
    model_name: str
    tools_enabled: List[str]

class PersonaFinding(TypedDict):
    persona_id: str
    summary: str
    sources: List[str]
    claims: List[str]
    confidence: str

class DebateMessage(TypedDict):
    round_number: int
    persona_id: str
    content: str
    cited_sources: List[str]
    confidence: str
    created_at: str

class ObserverCheckpoint(TypedDict):
    round_number: int
    consensus_score: float
    repetition_score: float
    agreements: List[str]
    disagreements: List[str]
    should_continue: bool
    reason: str

class CouncilState(TypedDict):
    session_id: str
    user_question: str
    task_brief: str
    debate_intensity: str
    personas: List[PersonaConfig]
    sources: List[Source]
    persona_findings: List[PersonaFinding]
    debate_messages: List[DebateMessage]
    observer_checkpoints: List[ObserverCheckpoint]
    round_count: int
    max_rounds: int
    consensus_threshold: float
    final_report: Optional[str]
    status: str
    user_stop_requested: bool
```

### 3.4 LangGraph Nodes

| Node | Runs | Responsibility |
|---|---|---|
| `input_validator` | Once | Validate question, check model, check personas, init state |
| `task_brief_generator` | Once | Convert question to structured research brief per persona |
| `persona_research` | Parallel per persona | Tavily search, URL fetch, claim extraction, findings |
| `evidence_merger` | Once | Dedup by URL, score relevance via Chroma, build shared pool |
| `initial_positions` | Parallel per persona | Read evidence pool, stake initial position with confidence |
| `debate_round` | Per round | Each persona responds to others; requires new value or revised position |
| `observer_checkpoint` | After each round | Score consensus + repetition, decide continue/stop |
| `router` | After checkpoint | Conditional edge: next round or final report |
| `final_report` | Once | Observer generates full structured report |

### 3.5 WebSocket Protocol

Endpoint: `GET /ws/sessions/{session_id}`

All messages are JSON envelopes:
```json
{ "type": "event.type", "payload": {}, "timestamp": "ISO8601" }
```

Event types:
```
session.started
research.begun
source.found
persona.position
debate.message
observer.checkpoint
debate.stopped
final_report.chunk
final_report.done
status.update
error
```

Session state is persisted to SQLite after every `debate.message` event. A failed session can be resumed or summarized from the last persisted state.

---

## 4. Frontend

### 4.1 Stack

- **Next.js 15** (App Router)
- **TailwindCSS**
- **shadcn/ui**
- **Zustand** — client state (active session, settings)
- **TanStack Query** — server state (session list, personas, model configs)

### 4.2 Directory Structure

```
/frontend
  /app
    /                         → Home screen
    /session/[id]/            → Live council screen
    /session/[id]/report/     → Final report screen
    /history/                 → Session history
    /settings/models/         → Model provider config
    /settings/personas/       → Persona manager
  /components
    /debate
      MessageCard.tsx         → single persona message card
      ObserverCheckpoint.tsx  → observer summary card
      PhaseIndicator.tsx      → current phase display
      SourcePanel.tsx         → collapsible source list
    /session
      QuestionForm.tsx
      IntensitySelector.tsx
      ModelSelector.tsx
    /report
      ReportSection.tsx
      SourceList.tsx
      ExportButton.tsx
    /onboarding
      ModelSetupCard.tsx      → first-run model download screen
    /ui                       → shadcn/ui wrappers
  /hooks
    useDebateSocket.ts        → WebSocket connection, event queue, reconnect
    useSession.ts
    useModels.ts
  /stores
    sessionStore.ts           → Zustand: active session, debate messages, sources
    settingsStore.ts          → Zustand: local UI preferences
```

### 4.3 Screens

**Home (`/`)**
- Question textarea
- Debate intensity toggle: Quick / Standard / Deep Dive
- Model dropdown (simple mode: one model for all personas)
- Start Council button
- Recent sessions list (last 5, linked to history)

**Live Council (`/session/[id]`)**
- Phase indicator: Researching → Initial Positions → Round N → Final
- Streaming message cards per persona (name chip, role, round, content, cited sources, optional confidence)
- Observer checkpoint cards between rounds (consensus level, agreements, disagreements)
- Collapsible Source Panel (right side or bottom drawer)
- Stop button (graceful stop → triggers final report)
- Skip to Final Report button
- Pause auto-scroll toggle

**Final Report (`/session/[id]/report`)**
- Recommendation (direct, not hedged)
- Confidence (Low / Medium / High)
- Executive Summary
- Key Agreements / Key Disagreements
- Per-persona strongest argument
- Key Risks / Key Opportunities
- Sources with links
- Open Questions
- Copy Markdown button, Export .md button

**Persona Manager (`/settings/personas`)**
- List with enable/disable toggle per persona
- Edit drawer: name, role, system prompt, research on/off, aggression (Calm / Balanced / Intense)
- Add custom persona
- Delete custom persona
- Restore defaults button
- Observer cannot be deleted (UI enforces this)

**Model Settings (`/settings/models`)**
- Ollama URL field (default: `http://host.docker.internal:11434`) + Test Connection
- Per-provider API key cards: OpenAI, Anthropic, Gemini, Moonshot, OpenRouter
- Each card: masked key display, Update Key, Delete Key, Test Connection
- Default model selector
- Advanced mode toggle → per-persona model assignment in persona edit drawer

**History (`/history`)**
- Searchable list of past sessions
- Filter by date
- Each item: question preview, date, intensity, model, final recommendation preview
- Open / Delete actions

### 4.4 Onboarding Flow

Triggered on first load when:
- No API keys are configured, AND
- Ollama is unreachable at the configured URL

Shows a full-screen setup card with two paths:
1. **Download Qwen3-0.6B** — progress bar, ~400MB, CPU-only, no web research
2. **Configure a provider** — links to Model Settings

User can dismiss and use the app without a model (will be blocked at session start with a clear message).

### 4.5 Visual Direction

- Dark default theme
- Near-black background (`#0a0a0a`), off-white text (`#f5f5f5`)
- Single accent color for interactive elements
- Persona name chips color-coded by role (subtle, not loud)
- Message cards: clean white-on-dark cards with a left border per persona color
- No avatars, no animations beyond subtle fade-in for new messages
- Reduced motion respected via `prefers-reduced-motion`

---

## 5. Model Gateway

### 5.1 Interface

```python
class ModelGateway:
    async def generate(self, prompt: str, model_config: dict) -> str
    async def stream(self, prompt: str, model_config: dict) -> AsyncIterator[str]
    def supports_streaming(self, model_config: dict) -> bool
    def supports_tool_calling(self, model_config: dict) -> bool
    def get_context_window(self, model_config: dict) -> int
```

No persona or graph node calls a provider directly. All inference goes through `ModelGateway`.

### 5.2 Supported Providers

| Provider | Key Storage | Tool Calling | Streaming |
|---|---|---|---|
| OpenAI | Encrypted SQLite | Yes | Yes |
| Anthropic | Encrypted SQLite | Yes | Yes |
| Google Gemini | Encrypted SQLite | Yes | Yes |
| Moonshot/Kimi | Encrypted SQLite | Yes | Yes |
| OpenRouter | Encrypted SQLite | Model-dependent | Yes |
| Ollama | URL in settings | Model-dependent | Yes |
| HuggingFace (local) | None (auto-downloaded) | No | Yes (streaming generation) |

### 5.3 API Key Security

1. User enters key in the UI
2. Frontend POSTs key to `POST /api/models/keys/{provider}`
3. Backend encrypts with Fernet (encryption key generated on first boot, stored as `secret.key` in the `dissentlab_db` volume alongside the SQLite file — never in the database itself)
4. Encrypted value saved to SQLite `settings` table
5. Frontend receives only a masked preview (`sk-...****`) — plaintext never returned
6. User can delete any key from settings; deletion removes the SQLite row

### 5.4 HuggingFace Fallback (Qwen3-0.6B)

- Downloaded via `huggingface_hub.snapshot_download("Qwen/Qwen3-0.6B")` to the `dissentlab_models` volume
- Progress events streamed to the onboarding UI via a separate SSE endpoint (`GET /api/models/download/progress`)
- Loaded once at backend startup (if weights are present) using `transformers.AutoModelForCausalLM` + CPU `torch` backend; kept in memory for the lifetime of the backend process
- When this provider is active: web research is automatically disabled (model has no tool calling), UI shows a notice explaining this
- Response latency: ~3–8s per generation on CPU (acceptable for a personal tool)

### 5.5 Model Assignment Modes

- **Simple (default):** One provider + model for the whole council, selected in home screen dropdown
- **Advanced:** Per-persona model assignment in the persona edit drawer; toggled via an "Advanced" switch in Model Settings

---

## 6. Research System

### 6.1 Search Provider

**Tavily** — configured via API key in Model Settings. If no Tavily key is present, web research is skipped for the entire session and the UI shows a notice in the Source Panel.

### 6.2 Per-Persona Research Brief

The `task_brief_generator` node derives a research angle for each persona from the user's question:

- Optimist: searches for opportunity signals, successful examples, positive market data
- Pessimist: searches for failure modes, risks, costs, competition
- Contrarian: searches for counterexamples, challenged assumptions, alternative framings

### 6.3 Research Limits

| Mode | Max searches/persona | Max URLs/persona |
|---|---|---|
| Quick | 2 | 3 |
| Standard | 4 | 6 |
| Deep Dive | 8 | 12 |

Global session hard limits: 30 total searches, 50 total URLs read.

### 6.4 Evidence Merger

After all personas complete research:
- Deduplicate sources by exact URL
- Score relevance via Chroma embedding similarity (sentence-transformers)
- Build shared evidence pool: all personas can cite any source in the debate
- Track `discovered_by` persona per source

### 6.5 Webpage Fetching

- `httpx` with `robots.txt` respect
- `trafilatura` for HTML-to-readable-text extraction
- Rate limited to 2 requests/second per persona
- Results cached to `dissentlab_cache` volume (24h TTL, keyed by URL hash)

---

## 7. Consensus & Stopping Logic

### 7.1 Observer Checkpoint

Fires after every debate round. Outputs:

```json
{
  "consensus_score": 0.0–1.0,
  "repetition_score": 0.0–1.0,
  "agreements": ["..."],
  "disagreements": ["..."],
  "should_continue": true/false,
  "reason": "..."
}
```

**Consensus score:** embedding similarity across all active personas' current stated positions.

**Repetition score:** overlap between this round's arguments and the previous round's arguments.

### 7.2 Stop Conditions (any one triggers final report)

```
consensus_score >= 0.75
round_count >= max_rounds
repetition_score >= 0.85 for 2 consecutive rounds
user clicks Stop or Skip to Final
critical provider/tool failure
```

### 7.3 Max Rounds by Mode

| Mode | Max rounds |
|---|---|
| Quick | 1 |
| Standard | 5 |
| Deep Dive | 15 |

### 7.4 No Fake Consensus

If stopped at max rounds or high repetition without consensus, the final report must explicitly state disagreement remains. Observer does not invent agreement.

---

## 8. Data Model (SQLite)

### Tables

```sql
sessions            (id, question, created_at, updated_at, status,
                     debate_intensity, model_summary, final_recommendation_preview)

personas            (id, name, role, system_prompt, enabled, is_default,
                     model_provider, model_name, tool_permissions,
                     created_at, updated_at)

sources             (id, session_id, title, url, domain, summary,
                     discovered_by_persona_id, relevance_score, retrieved_at)

persona_findings    (id, session_id, persona_id, summary, confidence, created_at)

debate_messages     (id, session_id, round_number, persona_id, content,
                     cited_source_ids, confidence, created_at)

observer_checkpoints (id, session_id, round_number, consensus_score,
                      repetition_score, agreements_json, disagreements_json,
                      should_continue, reason, created_at)

final_reports       (id, session_id, content_markdown, confidence,
                     recommendation, created_at)

settings            (key, value, updated_at)
```

The `settings` table stores encrypted API keys (one row per provider key, e.g. `key = "openai_api_key"`), the Ollama URL, and app preferences.

---

## 9. Error Handling

| Condition | User message |
|---|---|
| Model provider failure | "The model provider failed. You can retry, switch model, or generate a partial summary from completed messages." |
| Tavily search failure | "Web research failed for one or more personas. The council will continue with available evidence." |
| Ollama unreachable | "Local model not available. Check that Ollama is running or choose another provider." |
| No sources found | "No reliable sources found. The final answer is based on reasoning only — treat with lower confidence." |
| Rate limit hit | "The model provider rate limit was reached. Try again in a moment or choose another model." |
| HuggingFace download failure | "Model download failed. Check your internet connection or configure a provider API key instead." |
| WebSocket disconnected | "Connection lost — reconnecting..." with exponential backoff (3 attempts), then manual reconnect button |

Provider failures mid-session do not discard generated content. Session state is persisted to SQLite after every debate message.

---

## 10. Defaults

| Setting | Default |
|---|---|
| Active personas | Optimist, Pessimist, Contrarian (Observer always active) |
| Debate intensity | Standard |
| Max rounds (Standard) | 5 |
| Max rounds (Deep Dive) | 15 |
| Max rounds (Quick) | 1 |
| Consensus threshold | 0.75 |
| Repetition threshold | 0.85 (2 consecutive rounds) |
| Model mode | Simple (one model for all personas) |
| Ollama URL | `http://host.docker.internal:11434` |
| Web research | Enabled (if Tavily key present) |
| UI theme | Dark |

---

## 11. Out of Scope for V1

- Multi-user collaboration
- Cloud sync or accounts
- File/PDF ingestion
- Voice mode
- Agent memory across sessions
- Persona marketplace
- Mobile app
- Browser extension
- PDF export
- Payment system
- Full Tauri desktop wrapper (deferred — web-first for V1)

---

## 12. Open Questions (Deferred)

These were identified in the PRD and are deferred to V1.1 or later:

1. Should Observer messages appear after every round or only when meaningful? → Design decision for implementation: default to every round, suppress if checkpoint adds no new info.
2. Should users be able to interrupt the debate with follow-up instructions mid-session? → Deferred to V1.1.
3. Should source page snapshots be stored (full text) or only metadata + summary? → V1: store summary + metadata only. Full snapshots cached in `dissentlab_cache` volume for 24h but not persisted long-term to SQLite.

---

## 13. Build Priority (from PRD §41, adapted)

**Phase 1 — Core loop:**
1. Docker Compose setup (frontend + backend containers, volumes)
2. FastAPI skeleton + WebSocket endpoint
3. Next.js skeleton + `useDebateSocket` hook
4. SQLite schema + migrations
5. Model Gateway (OpenAI first, then others)
6. Default personas + LangGraph graph (no research, debate only)
7. Streaming debate UI (message cards, phase indicator)
8. Observer checkpoint + final report
9. HuggingFace fallback (Qwen3-0.6B) + onboarding screen

**Phase 2 — Research:**
10. Tavily integration
11. URL reader + trafilatura
12. Evidence merger + Chroma
13. Per-persona research briefs
14. Source panel UI

**Phase 3 — Polish:**
15. Persona manager UI
16. Model settings UI (all providers, key management)
17. Advanced per-persona model assignment
18. Session history screen
19. Markdown export
20. Error states + user-friendly messages
21. Debate intensity presets wired to research limits
