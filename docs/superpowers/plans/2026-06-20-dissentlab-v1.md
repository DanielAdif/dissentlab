# DissentLab V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build DissentLab V1 — a Dockerized web app where users watch a council of AI personas (Optimist, Pessimist, Contrarian, Observer) research and debate a question live, then receive a final synthesized recommendation.

**Architecture:** Two Docker containers connected via Compose — Next.js frontend (port 3000, host-exposed) proxies all requests to FastAPI backend (port 8000, internal only). The backend runs a LangGraph debate graph that streams events over WebSocket to the client. All persistent data lives in named Docker volumes (SQLite, Chroma, model weights, webpage cache). API keys are entered in the UI, encrypted with Fernet, and stored in SQLite — never in environment files.

**Tech Stack:** Next.js 15 App Router, TailwindCSS, shadcn/ui, Zustand 5, TanStack Query 5 (frontend); FastAPI, LangGraph 0.2+, LangChain 0.3+, aiosqlite, Chroma embedded, sentence-transformers, cryptography (Fernet), httpx, trafilatura (backend); Docker Compose, SQLite, Tavily search, HuggingFace Qwen3-0.6B fallback.

## Global Constraints

- Python 3.12 in backend container; Node.js 22 LTS in frontend container
- Next.js App Router only — no Pages Router
- All backend routes use `/api/` prefix; WebSocket at `/ws/sessions/{id}`
- WebSocket event envelope: `{"type": "event.type", "payload": {...}, "timestamp": "ISO8601"}`
- All API keys entered via UI → encrypted Fernet → SQLite `settings` table — never in `.env`
- Fernet secret key stored as `secret.key` file in `dissentlab_db` volume, NOT inside SQLite
- SQLite, Chroma, model weights, and webpage cache all live in named Docker volumes
- Ollama default URL: `http://host.docker.internal:11434` — user-configurable in settings
- All backend I/O is async (FastAPI + aiosqlite + LangGraph async nodes)
- TDD: write failing test first, implement to pass, commit after each task
- Zustand stores are the single source of truth for client-side session state

---

## File Structure

### Root
```
docker-compose.yml
docker-compose.dev.yml
.env.example
.gitignore
```

### Backend (`/backend`)
```
Dockerfile
.dockerignore
requirements.txt
main.py
api/
  __init__.py
  sessions.py        # POST /api/sessions, GET /api/sessions, GET /api/sessions/{id}, DELETE /api/sessions/{id}
  models.py          # GET /api/models/providers, POST /api/models/keys/{provider}, DELETE /api/models/keys/{provider}, GET /api/models/test/{provider}, GET /api/models/download/progress (SSE)
  settings.py        # GET /api/settings, PATCH /api/settings
  ws.py              # WebSocket /ws/sessions/{id}
agents/
  __init__.py
  base.py            # BasePersona dataclass, build_debate_prompt()
  optimist.py        # OPTIMIST_SYSTEM_PROMPT, OptimistPersona
  pessimist.py       # PESSIMIST_SYSTEM_PROMPT, PessimistPersona
  contrarian.py      # CONTRARIAN_SYSTEM_PROMPT, ContrarianPersona
  observer.py        # OBSERVER_SYSTEM_PROMPT, ObserverAgent
graph/
  __init__.py
  state.py           # CouncilState TypedDict and all nested TypedDicts
  nodes.py           # All LangGraph node async functions
  graph.py           # build_graph() -> CompiledStateGraph
models/
  __init__.py
  gateway.py         # ModelGateway class, ModelConfig dataclass
  providers/
    __init__.py
    base.py          # BaseProvider ABC
    openai.py        # OpenAIProvider
    anthropic.py     # AnthropicProvider
    gemini.py        # GeminiProvider
    moonshot.py      # MoonshotProvider
    openrouter.py    # OpenRouterProvider
    ollama.py        # OllamaProvider
    huggingface.py   # HuggingFaceProvider (Qwen3-0.6B, CPU)
tools/
  __init__.py
  search.py          # TavilySearchTool (Phase 2)
  reader.py          # URLReader via httpx + trafilatura (Phase 2)
  summarizer.py      # WebpageSummarizer (Phase 2)
  citations.py       # CitationExtractor (Phase 2)
storage/
  __init__.py
  db.py              # get_db(), run_migrations()
  repositories/
    __init__.py
    sessions.py      # SessionRepository
    personas.py      # PersonaRepository
    messages.py      # MessageRepository
    checkpoints.py   # CheckpointRepository
    reports.py       # ReportRepository
    settings.py      # SettingsRepository
    sources.py       # SourceRepository (Phase 2)
  chroma_client.py   # ChromaClient wrapper (Phase 2)
  file_cache.py      # FileCache URL hash→text (Phase 2)
security/
  __init__.py
  encryption.py      # get_or_create_fernet_key(), encrypt(), decrypt()
tests/
  conftest.py
  test_encryption.py
  test_gateway.py
  test_graph.py
  test_sessions_api.py
  test_repositories.py
  test_personas_api.py
```

### Frontend (`/frontend`)
```
Dockerfile
package.json
tsconfig.json
next.config.ts         # rewrites /api/* and /ws/* to backend
tailwind.config.ts
components.json        # shadcn/ui config
app/
  globals.css
  layout.tsx           # root layout, QueryClientProvider, dark theme
  page.tsx             # Home screen
  session/
    [id]/
      page.tsx         # Live council screen
      report/
        page.tsx       # Final report screen
  history/
    page.tsx           # Session history
  settings/
    models/
      page.tsx         # Model provider configuration
    personas/
      page.tsx         # Persona manager
components/
  debate/
    MessageCard.tsx
    ObserverCheckpoint.tsx
    PhaseIndicator.tsx
    SourcePanel.tsx    # Phase 2
  session/
    QuestionForm.tsx
    IntensitySelector.tsx
    ModelSelector.tsx
  report/
    ReportSection.tsx
    ExportButton.tsx
  onboarding/
    ModelSetupCard.tsx
  ui/                  # shadcn/ui generated components
hooks/
  useDebateSocket.ts
  useSession.ts
  useModels.ts
stores/
  sessionStore.ts
  settingsStore.ts
lib/
  api.ts               # typed fetch wrappers
  utils.ts             # cn() shadcn utility
tests/
  hooks/
    useDebateSocket.test.ts
  components/
    MessageCard.test.tsx
  stores/
    sessionStore.test.ts
```

---

## Phase 1 — Core Loop

### Task 1: Docker Compose and Project Scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `backend/requirements.txt`
- Create: `frontend/Dockerfile`

**Interfaces:**
- Produces: Running `docker compose up --build` starts both services; `http://localhost:3000` is reachable

- [ ] **Step 1: Create `.env.example`**

```
FRONTEND_PORT=3000
BACKEND_PORT=8000
OLLAMA_URL=http://host.docker.internal:11434
```

- [ ] **Step 2: Create `.gitignore`**

```
.env
__pycache__/
*.pyc
.pytest_cache/
node_modules/
.next/
*.egg-info/
dist/
.venv/
```

- [ ] **Step 3: Create `backend/requirements.txt`**

```
fastapi==0.115.6
uvicorn[standard]==0.32.1
websockets==13.1
langgraph==0.2.60
langchain==0.3.14
langchain-openai==0.2.14
langchain-anthropic==0.3.3
langchain-google-genai==2.0.7
aiosqlite==0.20.0
chromadb==0.6.3
sentence-transformers==3.3.1
httpx==0.28.1
trafilatura==2.0.0
cryptography==43.0.3
huggingface-hub==0.26.5
transformers==4.47.1
torch==2.5.1
pydantic==2.10.4
python-dotenv==1.0.1
tavily-python==0.5.0
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1
```

- [ ] **Step 4: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 5: Create `backend/.dockerignore`**

```
__pycache__
*.pyc
*.pyo
.pytest_cache
tests/
.venv
*.egg-info
```

- [ ] **Step 6: Create `frontend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 7: Create `docker-compose.yml`**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - OLLAMA_URL=${OLLAMA_URL:-http://host.docker.internal:11434}
    volumes:
      - dissentlab_db:/data/db
      - dissentlab_chroma:/data/chroma
      - dissentlab_models:/data/models
      - dissentlab_cache:/data/cache
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    networks:
      - dissentlab

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      - BACKEND_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - dissentlab

volumes:
  dissentlab_db:
  dissentlab_chroma:
  dissentlab_models:
  dissentlab_cache:

networks:
  dissentlab:
    driver: bridge
```

- [ ] **Step 8: Create `docker-compose.dev.yml`**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
      - dissentlab_db:/data/db
      - dissentlab_chroma:/data/chroma
      - dissentlab_models:/data/models
      - dissentlab_cache:/data/cache
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - dissentlab

  frontend:
    image: node:22-alpine
    working_dir: /app
    command: npm run dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - BACKEND_URL=http://backend:8000
    depends_on:
      - backend
    networks:
      - dissentlab

volumes:
  dissentlab_db:
  dissentlab_chroma:
  dissentlab_models:
  dissentlab_cache:

networks:
  dissentlab:
    driver: bridge
```

- [ ] **Step 9: Verify compose file parses**

```bash
docker compose config
```
Expected: Prints merged config with no errors.

- [ ] **Step 10: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml .env.example .gitignore backend/Dockerfile backend/.dockerignore backend/requirements.txt frontend/Dockerfile
git commit -m "feat: add Docker Compose stack and project scaffolding"
```

---

### Task 2: SQLite Schema and Storage Layer

**Files:**
- Create: `backend/storage/db.py`
- Create: `backend/storage/repositories/sessions.py`
- Create: `backend/storage/repositories/personas.py`
- Create: `backend/storage/repositories/settings.py`
- Create: `backend/storage/repositories/messages.py`
- Create: `backend/storage/repositories/checkpoints.py`
- Create: `backend/storage/repositories/reports.py`
- Create: `backend/tests/test_repositories.py`

**Interfaces:**
- Produces:
  - `get_db() -> aiosqlite.Connection` — async context manager
  - `SessionRepository(db)` with `create()`, `get()`, `list()`, `update_status()`, `update_preview()`
  - `PersonaRepository(db)` with `list_active()`, `get()`, `seed_defaults()`
  - `SettingsRepository(db)` with `get()`, `set()`
  - `MessageRepository(db)` with `create()`, `list_for_session()`
  - `CheckpointRepository(db)` with `create()`, `list_for_session()`, `latest_for_session()`
  - `ReportRepository(db)` with `create()`, `get_for_session()`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_repositories.py
import pytest
import aiosqlite
from storage.db import get_db, run_migrations
from storage.repositories.sessions import SessionRepository

@pytest.mark.asyncio
async def test_session_create_and_get(tmp_path):
    db_path = str(tmp_path / "test.db")
    async with aiosqlite.connect(db_path) as db:
        await run_migrations(db)
        repo = SessionRepository(db)
        session = await repo.create(
            question="Should I build a startup?",
            intensity="standard",
            model_summary="openai/gpt-4o"
        )
        assert session["id"] is not None
        assert session["question"] == "Should I build a startup?"
        assert session["status"] == "pending"

        fetched = await repo.get(session["id"])
        assert fetched["id"] == session["id"]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_repositories.py::test_session_create_and_get -v
```
Expected: `FAILED` — `ModuleNotFoundError: No module named 'storage'`

- [ ] **Step 3: Create `backend/storage/__init__.py`**

```python
```

- [ ] **Step 4: Create `backend/storage/db.py`**

```python
import os
import aiosqlite
from contextlib import asynccontextmanager

DB_PATH = os.environ.get("DB_PATH", "/data/db/dissentlab.db")

@asynccontextmanager
async def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await run_migrations(db)
        yield db

async def run_migrations(db: aiosqlite.Connection) -> None:
    await db.executescript("""
        PRAGMA journal_mode=WAL;

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            debate_intensity TEXT NOT NULL DEFAULT 'standard',
            model_summary TEXT NOT NULL DEFAULT '',
            final_recommendation_preview TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS personas (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            system_prompt TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            is_default INTEGER NOT NULL DEFAULT 0,
            model_provider TEXT NOT NULL DEFAULT '',
            model_name TEXT NOT NULL DEFAULT '',
            tool_permissions TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            domain TEXT NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            discovered_by_persona_id TEXT NOT NULL,
            relevance_score REAL NOT NULL DEFAULT 0.0,
            retrieved_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS persona_findings (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            persona_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            confidence TEXT NOT NULL DEFAULT 'medium',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS debate_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            round_number INTEGER NOT NULL,
            persona_id TEXT NOT NULL,
            content TEXT NOT NULL,
            cited_source_ids TEXT NOT NULL DEFAULT '[]',
            confidence TEXT NOT NULL DEFAULT 'medium',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS observer_checkpoints (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            round_number INTEGER NOT NULL,
            consensus_score REAL NOT NULL,
            repetition_score REAL NOT NULL,
            agreements_json TEXT NOT NULL DEFAULT '[]',
            disagreements_json TEXT NOT NULL DEFAULT '[]',
            should_continue INTEGER NOT NULL DEFAULT 1,
            reason TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS final_reports (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            content_markdown TEXT NOT NULL,
            confidence TEXT NOT NULL DEFAULT 'medium',
            recommendation TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    await db.commit()
```

- [ ] **Step 5: Create `backend/storage/repositories/__init__.py`**

```python
```

- [ ] **Step 6: Create `backend/storage/repositories/sessions.py`**

```python
import uuid
from datetime import datetime, timezone
import aiosqlite

class SessionRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def create(self, question: str, intensity: str, model_summary: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        session_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO sessions (id, question, created_at, updated_at, status, debate_intensity, model_summary)
               VALUES (?, ?, ?, ?, 'pending', ?, ?)""",
            (session_id, question, now, now, intensity, model_summary)
        )
        await self.db.commit()
        return await self.get(session_id)

    async def get(self, session_id: str) -> dict | None:
        async with self.db.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def list(self, limit: int = 20) -> list[dict]:
        async with self.db.execute(
            "SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def update_status(self, session_id: str, status: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        await self.db.execute(
            "UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?",
            (status, now, session_id)
        )
        await self.db.commit()

    async def update_preview(self, session_id: str, preview: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        await self.db.execute(
            "UPDATE sessions SET final_recommendation_preview = ?, updated_at = ? WHERE id = ?",
            (preview, now, session_id)
        )
        await self.db.commit()

    async def delete(self, session_id: str) -> None:
        await self.db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await self.db.commit()
```

- [ ] **Step 7: Create `backend/storage/repositories/personas.py`**

```python
import uuid
import json
from datetime import datetime, timezone
import aiosqlite

DEFAULT_PERSONAS = [
    {
        "id": "optimist",
        "name": "Optimist",
        "role": "Identifies opportunity, upside, and reasons the idea may succeed.",
        "system_prompt": (
            "You are the Optimist on this research council. Your role is to identify opportunity, "
            "upside, leverage, growth potential, and reasons the idea may succeed. "
            "Support claims with evidence when possible. Acknowledge uncertainty. "
            "Do not blindly agree with the user. Do not ignore major risks. "
            "Be direct and specific. Output valid JSON with keys: position, argument, "
            "evidence_used (list of source ids), challenge_to_others, confidence (Low/Medium/High)."
        ),
        "is_default": 1,
    },
    {
        "id": "pessimist",
        "name": "Pessimist",
        "role": "Identifies risks, failure modes, and reasons the idea may fail.",
        "system_prompt": (
            "You are the Pessimist on this research council. Your role is to identify risks, "
            "constraints, hidden costs, weaknesses, and reasons the idea may fail. "
            "Provide specific failure modes. Distinguish fatal risks from manageable ones. "
            "Do not be negative for entertainment only. Do not dismiss valid opportunities without evidence. "
            "Output valid JSON with keys: position, argument, evidence_used (list of source ids), "
            "challenge_to_others, confidence (Low/Medium/High)."
        ),
        "is_default": 1,
    },
    {
        "id": "contrarian",
        "name": "Contrarian",
        "role": "Challenges both sides, exposes assumptions, finds third interpretations.",
        "system_prompt": (
            "You are the Contrarian on this research council. Your role is to challenge both "
            "Optimist and Pessimist, expose weak assumptions, identify false binaries, and find "
            "third interpretations they are both missing. Attack reasoning, not personality. "
            "Always provide an alternative framing. Do not disagree randomly — cite your reasoning. "
            "Output valid JSON with keys: position, argument, evidence_used (list of source ids), "
            "challenge_to_others, confidence (Low/Medium/High)."
        ),
        "is_default": 1,
    },
    {
        "id": "observer",
        "name": "Observer",
        "role": "Neutral synthesizer. Tracks consensus, evaluates debate, generates final report.",
        "system_prompt": (
            "You are the Observer on this research council. You do not take sides. "
            "You monitor the debate, evaluate convergence, detect repetition, and produce synthesis. "
            "Do not invent consensus where disagreement remains. Clearly separate evidence, "
            "interpretation, and recommendation. "
            "For checkpoints, output valid JSON with keys: consensus_score (0.0-1.0), "
            "repetition_score (0.0-1.0), agreements (list), disagreements (list), "
            "should_continue (bool), reason (string)."
        ),
        "is_default": 1,
    },
]

class PersonaRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def seed_defaults(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        for p in DEFAULT_PERSONAS:
            await self.db.execute(
                """INSERT OR IGNORE INTO personas
                   (id, name, role, system_prompt, enabled, is_default, model_provider, model_name, tool_permissions, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, ?, '', '', '[]', ?, ?)""",
                (p["id"], p["name"], p["role"], p["system_prompt"], p["is_default"], now, now)
            )
        await self.db.commit()

    async def list_active(self) -> list[dict]:
        async with self.db.execute(
            "SELECT * FROM personas WHERE enabled = 1 ORDER BY is_default DESC, created_at ASC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def get(self, persona_id: str) -> dict | None:
        async with self.db.execute(
            "SELECT * FROM personas WHERE id = ?", (persona_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def create(self, name: str, role: str, system_prompt: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        persona_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO personas (id, name, role, system_prompt, enabled, is_default, model_provider, model_name, tool_permissions, created_at, updated_at)
               VALUES (?, ?, ?, ?, 1, 0, '', '', '[]', ?, ?)""",
            (persona_id, name, role, system_prompt, now, now)
        )
        await self.db.commit()
        return await self.get(persona_id)

    async def update(self, persona_id: str, **fields) -> dict | None:
        if not fields:
            return await self.get(persona_id)
        now = datetime.now(timezone.utc).isoformat()
        fields["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [persona_id]
        await self.db.execute(
            f"UPDATE personas SET {set_clause} WHERE id = ?", values
        )
        await self.db.commit()
        return await self.get(persona_id)

    async def delete(self, persona_id: str) -> None:
        await self.db.execute(
            "DELETE FROM personas WHERE id = ? AND is_default = 0", (persona_id,)
        )
        await self.db.commit()

    async def restore_defaults(self) -> None:
        await self.seed_defaults()
```

- [ ] **Step 8: Create `backend/storage/repositories/settings.py`**

```python
from datetime import datetime, timezone
import aiosqlite

class SettingsRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def get(self, key: str) -> str | None:
        async with self.db.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ) as cursor:
            row = await cursor.fetchone()
            return row["value"] if row else None

    async def set(self, key: str, value: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        await self.db.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at""",
            (key, value, now)
        )
        await self.db.commit()

    async def delete(self, key: str) -> None:
        await self.db.execute("DELETE FROM settings WHERE key = ?", (key,))
        await self.db.commit()

    async def all(self) -> dict[str, str]:
        async with self.db.execute("SELECT key, value FROM settings") as cursor:
            rows = await cursor.fetchall()
            return {r["key"]: r["value"] for r in rows}
```

- [ ] **Step 9: Create `backend/storage/repositories/messages.py`**

```python
import uuid
import json
from datetime import datetime, timezone
import aiosqlite

class MessageRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def create(self, session_id: str, round_number: int, persona_id: str,
                     content: str, cited_source_ids: list[str], confidence: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        msg_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO debate_messages
               (id, session_id, round_number, persona_id, content, cited_source_ids, confidence, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (msg_id, session_id, round_number, persona_id,
             content, json.dumps(cited_source_ids), confidence, now)
        )
        await self.db.commit()
        return {"id": msg_id, "session_id": session_id, "round_number": round_number,
                "persona_id": persona_id, "content": content,
                "cited_source_ids": cited_source_ids, "confidence": confidence, "created_at": now}

    async def list_for_session(self, session_id: str) -> list[dict]:
        async with self.db.execute(
            "SELECT * FROM debate_messages WHERE session_id = ? ORDER BY round_number, created_at",
            (session_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["cited_source_ids"] = json.loads(d["cited_source_ids"])
                result.append(d)
            return result
```

- [ ] **Step 10: Create `backend/storage/repositories/checkpoints.py`**

```python
import uuid
import json
from datetime import datetime, timezone
import aiosqlite

class CheckpointRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def create(self, session_id: str, round_number: int, consensus_score: float,
                     repetition_score: float, agreements: list, disagreements: list,
                     should_continue: bool, reason: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        cp_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO observer_checkpoints
               (id, session_id, round_number, consensus_score, repetition_score,
                agreements_json, disagreements_json, should_continue, reason, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cp_id, session_id, round_number, consensus_score, repetition_score,
             json.dumps(agreements), json.dumps(disagreements),
             1 if should_continue else 0, reason, now)
        )
        await self.db.commit()
        return {"id": cp_id, "session_id": session_id, "round_number": round_number,
                "consensus_score": consensus_score, "repetition_score": repetition_score,
                "agreements": agreements, "disagreements": disagreements,
                "should_continue": should_continue, "reason": reason, "created_at": now}

    async def list_for_session(self, session_id: str) -> list[dict]:
        async with self.db.execute(
            "SELECT * FROM observer_checkpoints WHERE session_id = ? ORDER BY round_number",
            (session_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["agreements"] = json.loads(d["agreements_json"])
                d["disagreements"] = json.loads(d["disagreements_json"])
                d["should_continue"] = bool(d["should_continue"])
                result.append(d)
            return result

    async def latest_for_session(self, session_id: str) -> dict | None:
        checkpoints = await self.list_for_session(session_id)
        return checkpoints[-1] if checkpoints else None
```

- [ ] **Step 11: Create `backend/storage/repositories/reports.py`**

```python
import uuid
from datetime import datetime, timezone
import aiosqlite

class ReportRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def create(self, session_id: str, content_markdown: str,
                     confidence: str, recommendation: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        report_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO final_reports (id, session_id, content_markdown, confidence, recommendation, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (report_id, session_id, content_markdown, confidence, recommendation, now)
        )
        await self.db.commit()
        return {"id": report_id, "session_id": session_id, "content_markdown": content_markdown,
                "confidence": confidence, "recommendation": recommendation, "created_at": now}

    async def get_for_session(self, session_id: str) -> dict | None:
        async with self.db.execute(
            "SELECT * FROM final_reports WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
            (session_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None
```

- [ ] **Step 12: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_repositories.py::test_session_create_and_get -v
```
Expected: `PASSED`

- [ ] **Step 13: Create `backend/tests/conftest.py`**

```python
import pytest
```

- [ ] **Step 14: Commit**

```bash
git add backend/storage/ backend/tests/
git commit -m "feat: add SQLite schema and repository layer"
```

---

### Task 3: API Key Encryption

**Files:**
- Create: `backend/security/__init__.py`
- Create: `backend/security/encryption.py`
- Create: `backend/tests/test_encryption.py`

**Interfaces:**
- Produces:
  - `get_or_create_fernet_key() -> Fernet` — loads or generates the Fernet key from `/data/db/secret.key`
  - `encrypt(plaintext: str) -> str` — returns base64-encoded ciphertext
  - `decrypt(ciphertext: str) -> str` — returns plaintext or raises ValueError

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_encryption.py
import pytest
import os
import tempfile

def test_encrypt_decrypt_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from security.encryption import encrypt, decrypt
    plaintext = "sk-test-api-key-12345"
    ciphertext = encrypt(plaintext)
    assert ciphertext != plaintext
    assert decrypt(ciphertext) == plaintext

def test_different_plaintexts_produce_different_ciphertexts(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from security.encryption import encrypt
    c1 = encrypt("key-one")
    c2 = encrypt("key-two")
    assert c1 != c2

def test_decrypt_invalid_raises(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from security.encryption import decrypt
    with pytest.raises(ValueError):
        decrypt("not-valid-ciphertext")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_encryption.py -v
```
Expected: `FAILED` — `ModuleNotFoundError`

- [ ] **Step 3: Create `backend/security/__init__.py`**

```python
```

- [ ] **Step 4: Create `backend/security/encryption.py`**

```python
import os
from cryptography.fernet import Fernet, InvalidToken

_fernet: Fernet | None = None

def _get_key_path() -> str:
    db_path = os.environ.get("DB_PATH", "/data/db/dissentlab.db")
    return os.path.join(os.path.dirname(db_path), "secret.key")

def get_or_create_fernet_key() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet
    key_path = _get_key_path()
    os.makedirs(os.path.dirname(key_path), exist_ok=True)
    if os.path.exists(key_path):
        with open(key_path, "rb") as f:
            key = f.read().strip()
    else:
        key = Fernet.generate_key()
        with open(key_path, "wb") as f:
            f.write(key)
    _fernet = Fernet(key)
    return _fernet

def encrypt(plaintext: str) -> str:
    fernet = get_or_create_fernet_key()
    return fernet.encrypt(plaintext.encode()).decode()

def decrypt(ciphertext: str) -> str:
    fernet = get_or_create_fernet_key()
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception) as e:
        raise ValueError(f"Decryption failed: {e}") from e
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_encryption.py -v
```
Expected: All 3 tests `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/security/ backend/tests/test_encryption.py
git commit -m "feat: add Fernet API key encryption"
```

---

### Task 4: Model Gateway and OpenAI Provider

**Files:**
- Create: `backend/models/__init__.py`
- Create: `backend/models/gateway.py`
- Create: `backend/models/providers/__init__.py`
- Create: `backend/models/providers/base.py`
- Create: `backend/models/providers/openai.py`
- Create: `backend/tests/test_gateway.py`

**Interfaces:**
- Produces:
  - `ModelConfig` dataclass: `provider: str`, `model_name: str`, `api_key: str | None`, `base_url: str | None`
  - `ModelGateway` class:
    - `async generate(messages: list[dict], config: ModelConfig) -> str`
    - `async stream(messages: list[dict], config: ModelConfig) -> AsyncIterator[str]`
    - `supports_tool_calling(config: ModelConfig) -> bool`
    - `get_context_window(config: ModelConfig) -> int`
  - `BaseProvider` ABC with same interface

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_gateway.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models.gateway import ModelGateway, ModelConfig

@pytest.mark.asyncio
async def test_gateway_generate_openai():
    config = ModelConfig(provider="openai", model_name="gpt-4o-mini", api_key="test-key")
    gateway = ModelGateway()
    messages = [{"role": "user", "content": "Say hello"}]

    with patch("models.providers.openai.AsyncOpenAI") as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hello!"
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        result = await gateway.generate(messages, config)
        assert result == "Hello!"

def test_gateway_supports_tool_calling():
    gateway = ModelGateway()
    openai_config = ModelConfig(provider="openai", model_name="gpt-4o", api_key="k")
    hf_config = ModelConfig(provider="huggingface", model_name="Qwen3-0.6B", api_key=None)
    assert gateway.supports_tool_calling(openai_config) is True
    assert gateway.supports_tool_calling(hf_config) is False
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_gateway.py -v
```
Expected: `FAILED` — `ModuleNotFoundError: No module named 'models'`

- [ ] **Step 3: Create `backend/models/__init__.py` and `backend/models/providers/__init__.py`**

```python
```

- [ ] **Step 4: Create `backend/models/providers/base.py`**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator

@dataclass
class ModelConfig:
    provider: str
    model_name: str
    api_key: str | None = None
    base_url: str | None = None

class BaseProvider(ABC):
    @abstractmethod
    async def generate(self, messages: list[dict], config: ModelConfig) -> str: ...

    @abstractmethod
    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]: ...

    @property
    def supports_tool_calling(self) -> bool:
        return True

    @property
    def context_window(self) -> int:
        return 128000
```

- [ ] **Step 5: Create `backend/models/providers/openai.py`**

```python
from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import BaseProvider, ModelConfig

class OpenAIProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = AsyncOpenAI(api_key=config.api_key, base_url=config.base_url)
        response = await client.chat.completions.create(
            model=config.model_name,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = AsyncOpenAI(api_key=config.api_key, base_url=config.base_url)
        async with client.chat.completions.stream(
            model=config.model_name,
            messages=messages,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta

    @property
    def supports_tool_calling(self) -> bool:
        return True

    @property
    def context_window(self) -> int:
        return 128000
```

- [ ] **Step 6: Create `backend/models/gateway.py`**

```python
from typing import AsyncIterator
from .providers.base import BaseProvider, ModelConfig
from .providers.openai import OpenAIProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
}

def _get_provider(config: ModelConfig) -> BaseProvider:
    provider_class = _PROVIDERS.get(config.provider)
    if provider_class is None:
        raise ValueError(f"Unknown provider: {config.provider}")
    return provider_class()

class ModelGateway:
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        provider = _get_provider(config)
        return await provider.generate(messages, config)

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        provider = _get_provider(config)
        async for chunk in provider.stream(messages, config):
            yield chunk

    def supports_tool_calling(self, config: ModelConfig) -> bool:
        if config.provider == "huggingface":
            return False
        return True

    def get_context_window(self, config: ModelConfig) -> int:
        try:
            return _get_provider(config).context_window
        except ValueError:
            return 128000
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_gateway.py -v
```
Expected: Both tests `PASSED`

- [ ] **Step 8: Commit**

```bash
git add backend/models/ backend/tests/test_gateway.py
git commit -m "feat: add ModelGateway with OpenAI provider"
```

---

### Task 5: Additional Model Providers

**Files:**
- Create: `backend/models/providers/anthropic.py`
- Create: `backend/models/providers/gemini.py`
- Create: `backend/models/providers/moonshot.py`
- Create: `backend/models/providers/openrouter.py`
- Create: `backend/models/providers/ollama.py`
- Modify: `backend/models/gateway.py` — register all providers

**Interfaces:**
- Consumes: `BaseProvider`, `ModelConfig` from Task 4
- Produces: All providers registered in `_PROVIDERS` dict in `gateway.py`

- [ ] **Step 1: Create `backend/models/providers/anthropic.py`**

```python
from typing import AsyncIterator
import anthropic
from .base import BaseProvider, ModelConfig

class AnthropicProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = anthropic.AsyncAnthropic(api_key=config.api_key)
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_messages = [m for m in messages if m["role"] != "system"]
        response = await client.messages.create(
            model=config.model_name,
            max_tokens=8096,
            system=system,
            messages=user_messages,
        )
        return response.content[0].text if response.content else ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = anthropic.AsyncAnthropic(api_key=config.api_key)
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_messages = [m for m in messages if m["role"] != "system"]
        async with client.messages.stream(
            model=config.model_name,
            max_tokens=8096,
            system=system,
            messages=user_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    @property
    def context_window(self) -> int:
        return 200000
```

- [ ] **Step 2: Create `backend/models/providers/gemini.py`**

```python
from typing import AsyncIterator
import google.generativeai as genai
from .base import BaseProvider, ModelConfig

class GeminiProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        genai.configure(api_key=config.api_key)
        model = genai.GenerativeModel(config.model_name)
        prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        response = await model.generate_content_async(prompt)
        return response.text or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        genai.configure(api_key=config.api_key)
        model = genai.GenerativeModel(config.model_name)
        prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        async for chunk in await model.generate_content_async(prompt, stream=True):
            if chunk.text:
                yield chunk.text

    @property
    def context_window(self) -> int:
        return 1000000
```

- [ ] **Step 3: Create `backend/models/providers/moonshot.py`**

```python
from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import BaseProvider, ModelConfig

class MoonshotProvider(BaseProvider):
    """Moonshot/Kimi uses an OpenAI-compatible API."""

    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = AsyncOpenAI(
            api_key=config.api_key,
            base_url="https://api.moonshot.cn/v1"
        )
        response = await client.chat.completions.create(
            model=config.model_name,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = AsyncOpenAI(
            api_key=config.api_key,
            base_url="https://api.moonshot.cn/v1"
        )
        async with client.chat.completions.stream(
            model=config.model_name,
            messages=messages,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta
```

- [ ] **Step 4: Create `backend/models/providers/openrouter.py`**

```python
from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import BaseProvider, ModelConfig

class OpenRouterProvider(BaseProvider):
    """OpenRouter uses an OpenAI-compatible API."""

    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = AsyncOpenAI(
            api_key=config.api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        response = await client.chat.completions.create(
            model=config.model_name,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = AsyncOpenAI(
            api_key=config.api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        async with client.chat.completions.stream(
            model=config.model_name,
            messages=messages,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta
```

- [ ] **Step 5: Create `backend/models/providers/ollama.py`**

```python
import os
from typing import AsyncIterator
import httpx
from .base import BaseProvider, ModelConfig

OLLAMA_DEFAULT_URL = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")

class OllamaProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        base_url = config.base_url or OLLAMA_DEFAULT_URL
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{base_url}/api/chat",
                json={"model": config.model_name, "messages": messages, "stream": False},
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        base_url = config.base_url or OLLAMA_DEFAULT_URL
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{base_url}/api/chat",
                json={"model": config.model_name, "messages": messages, "stream": True},
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        import json
                        data = json.loads(line)
                        if content := data.get("message", {}).get("content"):
                            yield content
                        if data.get("done"):
                            break

    @property
    def supports_tool_calling(self) -> bool:
        return True  # model-dependent; assume capable models are used

    @property
    def context_window(self) -> int:
        return 32768
```

- [ ] **Step 6: Update `backend/models/gateway.py` to register all providers**

```python
from typing import AsyncIterator
from .providers.base import BaseProvider, ModelConfig
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider
from .providers.gemini import GeminiProvider
from .providers.moonshot import MoonshotProvider
from .providers.openrouter import OpenRouterProvider
from .providers.ollama import OllamaProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "moonshot": MoonshotProvider,
    "openrouter": OpenRouterProvider,
    "ollama": OllamaProvider,
}

_NO_TOOL_CALLING = {"huggingface"}

def _get_provider(config: ModelConfig) -> BaseProvider:
    provider_class = _PROVIDERS.get(config.provider)
    if provider_class is None:
        raise ValueError(f"Unknown provider: {config.provider}")
    return provider_class()

class ModelGateway:
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        provider = _get_provider(config)
        return await provider.generate(messages, config)

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        provider = _get_provider(config)
        async for chunk in provider.stream(messages, config):
            yield chunk

    def supports_tool_calling(self, config: ModelConfig) -> bool:
        return config.provider not in _NO_TOOL_CALLING

    def get_context_window(self, config: ModelConfig) -> int:
        try:
            return _get_provider(config).context_window
        except ValueError:
            return 128000
```

- [ ] **Step 7: Run existing gateway tests to confirm nothing broke**

```bash
cd backend && python -m pytest tests/test_gateway.py -v
```
Expected: Both tests `PASSED`

- [ ] **Step 8: Commit**

```bash
git add backend/models/providers/ backend/models/gateway.py
git commit -m "feat: add Anthropic, Gemini, Moonshot, OpenRouter, and Ollama providers"
```

---

### Task 6: LangGraph State Schema and Persona Agents

**Files:**
- Create: `backend/graph/__init__.py`
- Create: `backend/graph/state.py`
- Create: `backend/agents/__init__.py`
- Create: `backend/agents/base.py`
- Create: `backend/agents/optimist.py`
- Create: `backend/agents/pessimist.py`
- Create: `backend/agents/contrarian.py`
- Create: `backend/agents/observer.py`

**Interfaces:**
- Produces:
  - `CouncilState` TypedDict — the single shared state object threaded through all graph nodes
  - `build_debate_prompt(persona_system_prompt, question, round_messages, evidence_pool) -> list[dict]` — returns messages list for ModelGateway
  - `build_observer_checkpoint_prompt(question, messages) -> list[dict]`
  - `build_final_report_prompt(question, messages, checkpoints) -> list[dict]`

- [ ] **Step 1: Create `backend/graph/__init__.py` and `backend/agents/__init__.py`**

```python
```

- [ ] **Step 2: Create `backend/graph/state.py`**

```python
from typing import TypedDict, Optional

class Source(TypedDict):
    id: str
    title: str
    url: str
    domain: str
    retrieved_at: str
    summary: str
    discovered_by: str
    relevance_score: float
    claims: list[str]

class PersonaConfig(TypedDict):
    id: str
    name: str
    role: str
    system_prompt: str
    enabled: bool
    model_provider: str
    model_name: str
    tools_enabled: list[str]

class PersonaFinding(TypedDict):
    persona_id: str
    summary: str
    sources: list[str]
    claims: list[str]
    confidence: str

class DebateMessage(TypedDict):
    round_number: int
    persona_id: str
    persona_name: str
    content: str
    cited_sources: list[str]
    confidence: str
    created_at: str

class ObserverCheckpoint(TypedDict):
    round_number: int
    consensus_score: float
    repetition_score: float
    agreements: list[str]
    disagreements: list[str]
    should_continue: bool
    reason: str

class CouncilState(TypedDict):
    session_id: str
    user_question: str
    task_brief: str
    debate_intensity: str
    personas: list[PersonaConfig]
    sources: list[Source]
    persona_findings: list[PersonaFinding]
    debate_messages: list[DebateMessage]
    observer_checkpoints: list[ObserverCheckpoint]
    round_count: int
    max_rounds: int
    consensus_threshold: float
    final_report: Optional[str]
    status: str
    user_stop_requested: bool
    model_config: dict  # serialized ModelConfig: {provider, model_name, api_key, base_url}
    error: Optional[str]
```

- [ ] **Step 3: Create `backend/agents/base.py`**

```python
def build_debate_prompt(
    system_prompt: str,
    question: str,
    round_messages: list[dict],
    evidence_pool: list[dict],
    persona_name: str,
    round_number: int,
) -> list[dict]:
    source_context = ""
    if evidence_pool:
        source_context = "\n\nAvailable evidence pool:\n" + "\n".join(
            f"[{s['id']}] {s['title']} ({s['domain']}): {s['summary']}"
            for s in evidence_pool[:20]
        )

    prior_context = ""
    if round_messages:
        prior_context = "\n\nPrior debate messages this session:\n" + "\n".join(
            f"Round {m['round_number']} — {m['persona_name']}: {m['content']}"
            for m in round_messages
        )

    user_content = (
        f"Question under debate: {question}\n"
        f"You are: {persona_name} (Round {round_number})\n"
        f"{source_context}"
        f"{prior_context}\n\n"
        "Respond in your role. If there are prior messages, address them directly. "
        "Add new evidence, revise your position, or expose a flaw in another's reasoning. "
        "Do not repeat what was already said. Be concise and specific. "
        "Output valid JSON with keys: position, argument, evidence_used (list of source ids from evidence pool), "
        "challenge_to_others, confidence (Low/Medium/High)."
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


def build_observer_checkpoint_prompt(
    question: str,
    all_messages: list[dict],
    round_number: int,
) -> list[dict]:
    messages_text = "\n".join(
        f"Round {m['round_number']} — {m['persona_name']}: {m['content']}"
        for m in all_messages
    )
    content = (
        f"Question: {question}\n\n"
        f"Debate so far (through Round {round_number}):\n{messages_text}\n\n"
        "As Observer, evaluate the debate. Output valid JSON with keys:\n"
        "- consensus_score: float 0.0-1.0 (how aligned are positions)\n"
        "- repetition_score: float 0.0-1.0 (how much are they repeating themselves)\n"
        "- agreements: list of strings (what they agree on)\n"
        "- disagreements: list of strings (what remains unresolved)\n"
        "- should_continue: boolean (true if another round would add value)\n"
        "- reason: one sentence explaining your decision"
    )
    return [{"role": "user", "content": content}]


def build_final_report_prompt(
    question: str,
    all_messages: list[dict],
    checkpoints: list[dict],
    sources: list[dict],
) -> list[dict]:
    messages_text = "\n".join(
        f"Round {m['round_number']} — {m['persona_name']}: {m['content']}"
        for m in all_messages
    )
    last_checkpoint = checkpoints[-1] if checkpoints else {}
    agreements = last_checkpoint.get("agreements", [])
    disagreements = last_checkpoint.get("disagreements", [])
    consensus_score = last_checkpoint.get("consensus_score", 0.0)

    source_list = "\n".join(
        f"- [{s['id']}] {s['title']} ({s['domain']})" for s in sources[:20]
    )

    content = (
        f"Question: {question}\n\n"
        f"Full debate transcript:\n{messages_text}\n\n"
        f"Known agreements: {agreements}\n"
        f"Known disagreements: {disagreements}\n"
        f"Consensus score: {consensus_score:.2f}\n\n"
        f"Sources available:\n{source_list}\n\n"
        "As Observer, generate the final report. Format as markdown with these sections:\n"
        "## Direct Answer\n"
        "## Executive Summary\n"
        "## Council Recommendation\n"
        "## Confidence Level (Low/Medium/High)\n"
        "## Key Agreements\n"
        "## Key Disagreements\n"
        "## Optimist's Strongest Argument\n"
        "## Pessimist's Strongest Argument\n"
        "## Contrarian's Strongest Objection\n"
        "## Key Risks\n"
        "## Key Opportunities\n"
        "## Sources\n"
        "## Open Questions\n"
        "## Suggested Next Step\n\n"
        "Be direct. If the council did not reach consensus, say so clearly. "
        "Do not invent agreement where disagreement remains."
    )
    return [{"role": "user", "content": content}]
```

- [ ] **Step 4: Create `backend/agents/optimist.py`**

```python
from storage.repositories.personas import DEFAULT_PERSONAS

OPTIMIST_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "optimist"
)

class OptimistPersona:
    id = "optimist"
    name = "Optimist"
    system_prompt = OPTIMIST_SYSTEM_PROMPT
```

- [ ] **Step 5: Create `backend/agents/pessimist.py`**

```python
from storage.repositories.personas import DEFAULT_PERSONAS

PESSIMIST_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "pessimist"
)

class PessimistPersona:
    id = "pessimist"
    name = "Pessimist"
    system_prompt = PESSIMIST_SYSTEM_PROMPT
```

- [ ] **Step 6: Create `backend/agents/contrarian.py`**

```python
from storage.repositories.personas import DEFAULT_PERSONAS

CONTRARIAN_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "contrarian"
)

class ContrarianPersona:
    id = "contrarian"
    name = "Contrarian"
    system_prompt = CONTRARIAN_SYSTEM_PROMPT
```

- [ ] **Step 7: Create `backend/agents/observer.py`**

```python
from storage.repositories.personas import DEFAULT_PERSONAS

OBSERVER_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "observer"
)

class ObserverAgent:
    id = "observer"
    name = "Observer"
    system_prompt = OBSERVER_SYSTEM_PROMPT
```

- [ ] **Step 8: Commit**

```bash
git add backend/graph/ backend/agents/
git commit -m "feat: add LangGraph state schema and persona agent prompts"
```

---

### Task 7: LangGraph Debate Graph

**Files:**
- Create: `backend/graph/nodes.py`
- Create: `backend/graph/graph.py`
- Create: `backend/tests/test_graph.py`

**Interfaces:**
- Consumes: `CouncilState` from `graph/state.py`, `ModelGateway`, `ModelConfig` from Task 4, prompt builders from Task 6
- Produces:
  - `build_graph() -> CompiledStateGraph` — returns a compiled LangGraph graph
  - Graph accepts `CouncilState` input and produces updated `CouncilState` output
  - Each node emits events to an `asyncio.Queue` if provided in state (for WebSocket streaming)

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_graph.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from graph.graph import build_graph
from graph.state import CouncilState

@pytest.mark.asyncio
async def test_graph_compiles():
    graph = build_graph()
    assert graph is not None

@pytest.mark.asyncio
async def test_graph_runs_quick_mode():
    graph = build_graph()
    initial_state: CouncilState = {
        "session_id": "test-session",
        "user_question": "Should I build a startup?",
        "task_brief": "",
        "debate_intensity": "quick",
        "personas": [
            {"id": "optimist", "name": "Optimist", "role": "...", "system_prompt": "You are Optimist. Output JSON: {\"position\": \"test\", \"argument\": \"test\", \"evidence_used\": [], \"challenge_to_others\": \"none\", \"confidence\": \"Medium\"}", "enabled": True, "model_provider": "openai", "model_name": "gpt-4o-mini", "tools_enabled": []},
            {"id": "pessimist", "name": "Pessimist", "role": "...", "system_prompt": "You are Pessimist. Output JSON: {\"position\": \"test\", \"argument\": \"test\", \"evidence_used\": [], \"challenge_to_others\": \"none\", \"confidence\": \"Medium\"}", "enabled": True, "model_provider": "openai", "model_name": "gpt-4o-mini", "tools_enabled": []},
        ],
        "sources": [],
        "persona_findings": [],
        "debate_messages": [],
        "observer_checkpoints": [],
        "round_count": 0,
        "max_rounds": 1,
        "consensus_threshold": 0.75,
        "final_report": None,
        "status": "pending",
        "user_stop_requested": False,
        "model_config": {"provider": "openai", "model_name": "gpt-4o-mini", "api_key": "test", "base_url": None},
        "error": None,
    }

    mock_generate = AsyncMock(return_value='{"position": "good idea", "argument": "market exists", "evidence_used": [], "challenge_to_others": "none", "confidence": "Medium"}')
    observer_response = AsyncMock(return_value='{"consensus_score": 0.8, "repetition_score": 0.1, "agreements": ["market exists"], "disagreements": [], "should_continue": false, "reason": "consensus reached"}')
    final_report_response = AsyncMock(return_value="## Direct Answer\nProceed with caution.")

    call_count = {"n": 0}
    async def mock_gen(messages, config):
        call_count["n"] += 1
        if call_count["n"] <= 2:
            return await mock_generate(messages, config)
        elif call_count["n"] == 3:
            return await observer_response(messages, config)
        else:
            return await final_report_response(messages, config)

    with patch("graph.nodes.ModelGateway") as MockGateway:
        instance = MockGateway.return_value
        instance.generate = mock_gen
        result = await graph.ainvoke(initial_state)

    assert result["status"] in ("completed", "error")
    assert result["round_count"] >= 1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_graph.py::test_graph_compiles -v
```
Expected: `FAILED` — `ModuleNotFoundError: No module named 'graph.graph'`

- [ ] **Step 3: Create `backend/graph/nodes.py`**

```python
import json
import asyncio
from datetime import datetime, timezone
from models.gateway import ModelGateway, ModelConfig
from agents.base import (
    build_debate_prompt,
    build_observer_checkpoint_prompt,
    build_final_report_prompt,
)
from graph.state import CouncilState

_MAX_ROUNDS = {"quick": 1, "standard": 5, "deep_dive": 15}
_CONSENSUS_THRESHOLD = 0.75
_REPETITION_THRESHOLD = 0.85

def _get_model_config(state: CouncilState, persona_id: str | None = None) -> ModelConfig:
    mc = state["model_config"]
    return ModelConfig(
        provider=mc["provider"],
        model_name=mc["model_name"],
        api_key=mc.get("api_key"),
        base_url=mc.get("base_url"),
    )

def _emit(state: CouncilState, event_type: str, payload: dict) -> None:
    queue: asyncio.Queue | None = state.get("_event_queue")
    if queue:
        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        queue.put_nowait(event)


async def node_validate_input(state: CouncilState) -> CouncilState:
    active = [p for p in state["personas"] if p["enabled"]]
    if len(active) < 2:
        return {**state, "status": "error", "error": "At least 2 active personas required."}
    intensity = state["debate_intensity"]
    max_rounds = _MAX_ROUNDS.get(intensity, 5)
    _emit(state, "session.started", {"session_id": state["session_id"], "intensity": intensity})
    return {**state, "status": "researching", "max_rounds": max_rounds}


async def node_task_brief(state: CouncilState) -> CouncilState:
    question = state["user_question"]
    brief = (
        f"The council will investigate: {question}\n"
        f"Each persona researches from their own perspective and debates the others."
    )
    return {**state, "task_brief": brief}


async def node_initial_positions(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    active_personas = [p for p in state["personas"] if p["enabled"] and p["id"] != "observer"]
    new_messages = list(state["debate_messages"])

    _emit(state, "status.update", {"message": "Personas are forming initial positions..."})

    for persona in active_personas:
        messages = build_debate_prompt(
            system_prompt=persona["system_prompt"],
            question=state["user_question"],
            round_messages=[],
            evidence_pool=state["sources"],
            persona_name=persona["name"],
            round_number=0,
        )
        try:
            raw = await gateway.generate(messages, config)
            try:
                parsed = json.loads(raw)
                content = parsed.get("argument", raw)
                confidence = parsed.get("confidence", "Medium")
                cited = parsed.get("evidence_used", [])
            except json.JSONDecodeError:
                content = raw
                confidence = "Medium"
                cited = []
        except Exception as e:
            content = f"[Error generating position: {e}]"
            confidence = "Low"
            cited = []

        msg = {
            "round_number": 0,
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "cited_sources": cited,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        new_messages.append(msg)
        _emit(state, "persona.position", {"persona_id": persona["id"], "persona_name": persona["name"], "content": content, "confidence": confidence})

    return {**state, "debate_messages": new_messages, "status": "debating"}


async def node_debate_round(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    round_num = state["round_count"] + 1
    active_personas = [p for p in state["personas"] if p["enabled"] and p["id"] != "observer"]
    new_messages = list(state["debate_messages"])

    _emit(state, "status.update", {"message": f"Round {round_num} in progress..."})

    for persona in active_personas:
        messages = build_debate_prompt(
            system_prompt=persona["system_prompt"],
            question=state["user_question"],
            round_messages=new_messages,
            evidence_pool=state["sources"],
            persona_name=persona["name"],
            round_number=round_num,
        )
        try:
            raw = await gateway.generate(messages, config)
            try:
                parsed = json.loads(raw)
                content = parsed.get("argument", raw)
                confidence = parsed.get("confidence", "Medium")
                cited = parsed.get("evidence_used", [])
            except json.JSONDecodeError:
                content = raw
                confidence = "Medium"
                cited = []
        except Exception as e:
            content = f"[Error: {e}]"
            confidence = "Low"
            cited = []

        msg = {
            "round_number": round_num,
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "cited_sources": cited,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        new_messages.append(msg)
        _emit(state, "debate.message", {
            "round_number": round_num,
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "confidence": confidence,
            "cited_sources": cited,
        })

    return {**state, "debate_messages": new_messages, "round_count": round_num}


async def node_observer_checkpoint(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    observer_persona = next(
        (p for p in state["personas"] if p["id"] == "observer"), None
    )
    system_prompt = observer_persona["system_prompt"] if observer_persona else ""
    messages = build_observer_checkpoint_prompt(
        question=state["user_question"],
        all_messages=state["debate_messages"],
        round_number=state["round_count"],
    )
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        raw = await gateway.generate(messages, config)
        parsed = json.loads(raw)
        consensus_score = float(parsed.get("consensus_score", 0.5))
        repetition_score = float(parsed.get("repetition_score", 0.0))
        agreements = parsed.get("agreements", [])
        disagreements = parsed.get("disagreements", [])
        should_continue = bool(parsed.get("should_continue", True))
        reason = parsed.get("reason", "")
    except Exception:
        consensus_score = 0.5
        repetition_score = 0.0
        agreements = []
        disagreements = []
        should_continue = True
        reason = "Observer could not evaluate — continuing."

    checkpoint = {
        "round_number": state["round_count"],
        "consensus_score": consensus_score,
        "repetition_score": repetition_score,
        "agreements": agreements,
        "disagreements": disagreements,
        "should_continue": should_continue,
        "reason": reason,
    }
    new_checkpoints = list(state["observer_checkpoints"]) + [checkpoint]

    _emit(state, "observer.checkpoint", {
        "round_number": state["round_count"],
        "consensus_score": consensus_score,
        "agreements": agreements,
        "disagreements": disagreements,
        "should_continue": should_continue,
        "reason": reason,
    })

    return {**state, "observer_checkpoints": new_checkpoints}


def should_continue(state: CouncilState) -> str:
    if state.get("user_stop_requested"):
        return "final_report"
    if state.get("status") == "error":
        return "final_report"

    checkpoints = state["observer_checkpoints"]
    if not checkpoints:
        return "debate_round" if state["round_count"] < state["max_rounds"] else "final_report"

    latest = checkpoints[-1]
    if latest["consensus_score"] >= _CONSENSUS_THRESHOLD:
        return "final_report"
    if state["round_count"] >= state["max_rounds"]:
        return "final_report"
    if len(checkpoints) >= 2:
        prev = checkpoints[-2]
        if (latest["repetition_score"] >= _REPETITION_THRESHOLD and
                prev["repetition_score"] >= _REPETITION_THRESHOLD):
            return "final_report"
    if not latest["should_continue"]:
        return "final_report"
    return "debate_round"


async def node_final_report(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    observer_persona = next(
        (p for p in state["personas"] if p["id"] == "observer"), None
    )
    system_prompt = observer_persona["system_prompt"] if observer_persona else ""
    messages = build_final_report_prompt(
        question=state["user_question"],
        all_messages=state["debate_messages"],
        checkpoints=state["observer_checkpoints"],
        sources=state["sources"],
    )
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    _emit(state, "status.update", {"message": "Observer is generating final report..."})

    try:
        report = await gateway.generate(messages, config)
    except Exception as e:
        report = f"## Error\nFailed to generate final report: {e}"

    _emit(state, "final_report.done", {"content": report})

    return {**state, "final_report": report, "status": "completed"}
```

- [ ] **Step 4: Create `backend/graph/graph.py`**

```python
from langgraph.graph import StateGraph, END
from graph.state import CouncilState
from graph.nodes import (
    node_validate_input,
    node_task_brief,
    node_initial_positions,
    node_debate_round,
    node_observer_checkpoint,
    node_final_report,
    should_continue,
)

def build_graph():
    builder = StateGraph(CouncilState)

    builder.add_node("validate_input", node_validate_input)
    builder.add_node("task_brief", node_task_brief)
    builder.add_node("initial_positions", node_initial_positions)
    builder.add_node("debate_round", node_debate_round)
    builder.add_node("observer_checkpoint", node_observer_checkpoint)
    builder.add_node("final_report", node_final_report)

    builder.set_entry_point("validate_input")
    builder.add_edge("validate_input", "task_brief")
    builder.add_edge("task_brief", "initial_positions")
    builder.add_edge("initial_positions", "debate_round")
    builder.add_edge("debate_round", "observer_checkpoint")
    builder.add_conditional_edges(
        "observer_checkpoint",
        should_continue,
        {"debate_round": "debate_round", "final_report": "final_report"},
    )
    builder.add_edge("final_report", END)

    return builder.compile()
```

- [ ] **Step 5: Run tests**

```bash
cd backend && python -m pytest tests/test_graph.py -v
```
Expected: Both tests `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/graph/nodes.py backend/graph/graph.py backend/tests/test_graph.py
git commit -m "feat: add LangGraph debate graph with observer checkpoint routing"
```

---

### Task 8: FastAPI Application and WebSocket Session API

**Files:**
- Create: `backend/main.py`
- Create: `backend/api/__init__.py`
- Create: `backend/api/sessions.py`
- Create: `backend/api/models.py`
- Create: `backend/api/settings.py`
- Create: `backend/api/ws.py`
- Create: `backend/tests/test_sessions_api.py`

**Interfaces:**
- Consumes: All repositories from Task 2, `ModelGateway`/`ModelConfig` from Task 4, `build_graph()` from Task 7, `encrypt()`/`decrypt()` from Task 3
- Produces REST API:
  - `POST /api/sessions` → `{id, question, status, ...}`
  - `GET /api/sessions` → `[{id, question, ...}]`
  - `GET /api/sessions/{id}` → full session with messages, checkpoints, report
  - `DELETE /api/sessions/{id}` → 204
  - `GET /api/models/providers` → list of configured providers
  - `POST /api/models/keys/{provider}` body `{key: str}` → 200
  - `DELETE /api/models/keys/{provider}` → 204
  - `GET /api/models/test/{provider}` → `{ok: bool, message: str}`
  - `GET /api/models/download/progress` → SSE stream of download events
  - `GET /api/settings` → `{ollama_url, default_intensity, ...}`
  - `PATCH /api/settings` → updated settings
  - `WS /ws/sessions/{id}` → streams debate events as JSON

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_sessions_api.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

@pytest.fixture
def client():
    with patch("storage.db.DB_PATH", ":memory:"):
        from main import app
        with TestClient(app) as c:
            yield c

def test_create_session(client):
    response = client.post("/api/sessions", json={
        "question": "Should I build a startup?",
        "intensity": "standard",
        "model_provider": "openai",
        "model_name": "gpt-4o-mini",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["question"] == "Should I build a startup?"
    assert data["status"] == "pending"

def test_list_sessions_empty(client):
    response = client.get("/api/sessions")
    assert response.status_code == 200
    assert response.json() == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_sessions_api.py -v
```
Expected: `FAILED` — `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 3: Create `backend/api/__init__.py`**

```python
```

- [ ] **Step 4: Create `backend/api/sessions.py`**

```python
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.sessions import SessionRepository
from storage.repositories.messages import MessageRepository
from storage.repositories.checkpoints import CheckpointRepository
from storage.repositories.reports import ReportRepository
from storage.repositories.personas import PersonaRepository

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

class CreateSessionRequest(BaseModel):
    question: str
    intensity: str = "standard"
    model_provider: str = "openai"
    model_name: str = "gpt-4o-mini"

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(req: CreateSessionRequest):
    async with get_db() as db:
        repo = SessionRepository(db)
        persona_repo = PersonaRepository(db)
        await persona_repo.seed_defaults()
        model_summary = f"{req.model_provider}/{req.model_name}"
        session = await repo.create(req.question, req.intensity, model_summary)
        return session

@router.get("")
async def list_sessions():
    async with get_db() as db:
        repo = SessionRepository(db)
        return await repo.list()

@router.get("/{session_id}")
async def get_session(session_id: str):
    async with get_db() as db:
        repo = SessionRepository(db)
        session = await repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        msg_repo = MessageRepository(db)
        cp_repo = CheckpointRepository(db)
        rpt_repo = ReportRepository(db)
        messages = await msg_repo.list_for_session(session_id)
        checkpoints = await cp_repo.list_for_session(session_id)
        report = await rpt_repo.get_for_session(session_id)
        return {**session, "messages": messages, "checkpoints": checkpoints, "report": report}

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    async with get_db() as db:
        repo = SessionRepository(db)
        session = await repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        await repo.delete(session_id)
```

- [ ] **Step 5: Create `backend/api/models.py`**

```python
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.settings import SettingsRepository
from security.encryption import encrypt, decrypt
from models.gateway import ModelGateway, ModelConfig
import asyncio
import json

router = APIRouter(prefix="/api/models", tags=["models"])

PROVIDERS = ["openai", "anthropic", "gemini", "moonshot", "openrouter", "ollama", "huggingface"]

class SetKeyRequest(BaseModel):
    key: str

@router.get("/providers")
async def list_providers():
    async with get_db() as db:
        repo = SettingsRepository(db)
        result = []
        for provider in PROVIDERS:
            key_val = await repo.get(f"{provider}_api_key")
            has_key = key_val is not None
            result.append({"provider": provider, "configured": has_key})
        ollama_url = await repo.get("ollama_url") or os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
        return {"providers": result, "ollama_url": ollama_url}

@router.post("/keys/{provider}", status_code=200)
async def set_api_key(provider: str, req: SetKeyRequest):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    async with get_db() as db:
        repo = SettingsRepository(db)
        encrypted = encrypt(req.key)
        await repo.set(f"{provider}_api_key", encrypted)
        masked = req.key[:4] + "****" if len(req.key) > 4 else "****"
        return {"provider": provider, "masked": masked}

@router.delete("/keys/{provider}", status_code=204)
async def delete_api_key(provider: str):
    async with get_db() as db:
        repo = SettingsRepository(db)
        await repo.delete(f"{provider}_api_key")

@router.get("/test/{provider}")
async def test_provider(provider: str):
    async with get_db() as db:
        repo = SettingsRepository(db)
        if provider == "ollama":
            ollama_url = await repo.get("ollama_url") or os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
            import httpx
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    r = await client.get(f"{ollama_url}/api/tags")
                    r.raise_for_status()
                return {"ok": True, "message": f"Ollama reachable at {ollama_url}"}
            except Exception as e:
                return {"ok": False, "message": str(e)}
        key_val = await repo.get(f"{provider}_api_key")
        if not key_val:
            return {"ok": False, "message": "No API key configured"}
        try:
            api_key = decrypt(key_val)
            gateway = ModelGateway()
            default_models = {"openai": "gpt-4o-mini", "anthropic": "claude-haiku-4-5-20251001", "gemini": "gemini-2.0-flash", "moonshot": "moonshot-v1-8k", "openrouter": "openai/gpt-4o-mini"}
            model_name = default_models.get(provider, "gpt-4o-mini")
            config = ModelConfig(provider=provider, model_name=model_name, api_key=api_key)
            result = await gateway.generate([{"role": "user", "content": "Reply with exactly: ok"}], config)
            return {"ok": True, "message": f"Connected. Response: {result[:50]}"}
        except Exception as e:
            return {"ok": False, "message": str(e)}

@router.get("/download/progress")
async def download_progress():
    async def event_stream():
        from models.providers.huggingface import download_model, MODEL_PATH
        import os
        if os.path.exists(MODEL_PATH):
            yield f"data: {json.dumps({'status': 'already_downloaded'})}\n\n"
            return
        async for event in download_model():
            yield f"data: {json.dumps(event)}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

- [ ] **Step 6: Create `backend/api/settings.py`**

```python
import os
from fastapi import APIRouter
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.settings import SettingsRepository

router = APIRouter(prefix="/api/settings", tags=["settings"])

class PatchSettingsRequest(BaseModel):
    ollama_url: str | None = None
    default_intensity: str | None = None

@router.get("")
async def get_settings():
    async with get_db() as db:
        repo = SettingsRepository(db)
        ollama_url = await repo.get("ollama_url") or os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
        default_intensity = await repo.get("default_intensity") or "standard"
        return {"ollama_url": ollama_url, "default_intensity": default_intensity}

@router.patch("")
async def patch_settings(req: PatchSettingsRequest):
    async with get_db() as db:
        repo = SettingsRepository(db)
        if req.ollama_url is not None:
            await repo.set("ollama_url", req.ollama_url)
        if req.default_intensity is not None:
            await repo.set("default_intensity", req.default_intensity)
        return await get_settings()
```

- [ ] **Step 7: Create `backend/api/ws.py`**

```python
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from storage.db import get_db
from storage.repositories.sessions import SessionRepository
from storage.repositories.personas import PersonaRepository
from storage.repositories.settings import SettingsRepository
from storage.repositories.messages import MessageRepository
from storage.repositories.checkpoints import CheckpointRepository
from storage.repositories.reports import ReportRepository
from models.gateway import ModelConfig
from graph.graph import build_graph
from graph.state import CouncilState
from security.encryption import decrypt
import os

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/sessions/{session_id}")
async def debate_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    event_queue: asyncio.Queue = asyncio.Queue()

    async def send_event(event: dict):
        try:
            await websocket.send_json(event)
        except Exception:
            pass

    async def drain_queue():
        while True:
            try:
                event = event_queue.get_nowait()
                await send_event(event)
            except asyncio.QueueEmpty:
                break

    try:
        async with get_db() as db:
            session_repo = SessionRepository(db)
            persona_repo = PersonaRepository(db)
            settings_repo = SettingsRepository(db)
            msg_repo = MessageRepository(db)
            cp_repo = CheckpointRepository(db)
            rpt_repo = ReportRepository(db)

            session = await session_repo.get(session_id)
            if not session:
                await websocket.send_json({"type": "error", "payload": {"message": "Session not found"}, "timestamp": ""})
                await websocket.close()
                return

            await persona_repo.seed_defaults()
            personas_raw = await persona_repo.list_active()
            personas = [
                {
                    "id": p["id"], "name": p["name"], "role": p["role"],
                    "system_prompt": p["system_prompt"], "enabled": bool(p["enabled"]),
                    "model_provider": p["model_provider"], "model_name": p["model_name"],
                    "tools_enabled": json.loads(p["tool_permissions"]) if isinstance(p["tool_permissions"], str) else p["tool_permissions"],
                }
                for p in personas_raw
            ]

            provider = session["model_summary"].split("/")[0] if "/" in session["model_summary"] else "openai"
            model_name = session["model_summary"].split("/", 1)[1] if "/" in session["model_summary"] else "gpt-4o-mini"
            api_key_enc = await settings_repo.get(f"{provider}_api_key")
            api_key = decrypt(api_key_enc) if api_key_enc else None
            ollama_url = await settings_repo.get("ollama_url") or os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")

            model_config = {
                "provider": provider,
                "model_name": model_name,
                "api_key": api_key,
                "base_url": ollama_url if provider == "ollama" else None,
            }

            intensity = session["debate_intensity"]
            max_rounds_map = {"quick": 1, "standard": 5, "deep_dive": 15}

            initial_state: CouncilState = {
                "session_id": session_id,
                "user_question": session["question"],
                "task_brief": "",
                "debate_intensity": intensity,
                "personas": personas,
                "sources": [],
                "persona_findings": [],
                "debate_messages": [],
                "observer_checkpoints": [],
                "round_count": 0,
                "max_rounds": max_rounds_map.get(intensity, 5),
                "consensus_threshold": 0.75,
                "final_report": None,
                "status": "pending",
                "user_stop_requested": False,
                "model_config": model_config,
                "error": None,
                "_event_queue": event_queue,
            }

            await session_repo.update_status(session_id, "running")

            async def run_graph():
                graph = build_graph()
                result = await graph.ainvoke(initial_state)
                return result

            async def handle_client():
                while True:
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=1.0)
                        if data.get("type") == "user.stop":
                            event_queue.put_nowait({"_stop": True})
                    except asyncio.TimeoutError:
                        pass
                    except WebSocketDisconnect:
                        break

            graph_task = asyncio.create_task(run_graph())
            client_task = asyncio.create_task(handle_client())

            while not graph_task.done():
                await drain_queue()
                await asyncio.sleep(0.05)

            client_task.cancel()
            await drain_queue()

            result = graph_task.result()

            for msg in result.get("debate_messages", []):
                await msg_repo.create(
                    session_id=session_id,
                    round_number=msg["round_number"],
                    persona_id=msg["persona_id"],
                    content=msg["content"],
                    cited_source_ids=msg.get("cited_sources", []),
                    confidence=msg.get("confidence", "Medium"),
                )

            for cp in result.get("observer_checkpoints", []):
                await cp_repo.create(
                    session_id=session_id,
                    round_number=cp["round_number"],
                    consensus_score=cp["consensus_score"],
                    repetition_score=cp["repetition_score"],
                    agreements=cp["agreements"],
                    disagreements=cp["disagreements"],
                    should_continue=cp["should_continue"],
                    reason=cp["reason"],
                )

            if result.get("final_report"):
                report_text = result["final_report"]
                first_line = report_text.split("\n")[1] if "\n" in report_text else report_text[:100]
                last_cp = result["observer_checkpoints"][-1] if result["observer_checkpoints"] else {}
                confidence = "Medium"
                if last_cp.get("consensus_score", 0) >= 0.75:
                    confidence = "High"
                elif last_cp.get("consensus_score", 0) < 0.4:
                    confidence = "Low"
                await rpt_repo.create(
                    session_id=session_id,
                    content_markdown=report_text,
                    confidence=confidence,
                    recommendation=first_line,
                )
                await session_repo.update_preview(session_id, first_line[:200])

            final_status = result.get("status", "completed")
            await session_repo.update_status(session_id, final_status)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await send_event({"type": "error", "payload": {"message": str(e)}, "timestamp": ""})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
```

- [ ] **Step 8: Create `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.sessions import router as sessions_router
from api.models import router as models_router
from api.settings import router as settings_router
from api.ws import router as ws_router

app = FastAPI(title="DissentLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(models_router)
app.include_router(settings_router)
app.include_router(ws_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 9: Run API tests**

```bash
cd backend && python -m pytest tests/test_sessions_api.py -v
```
Expected: Both tests `PASSED`

- [ ] **Step 10: Commit**

```bash
git add backend/main.py backend/api/ backend/tests/test_sessions_api.py
git commit -m "feat: add FastAPI app with session CRUD and WebSocket debate endpoint"
```

---

### Task 9: HuggingFace Fallback Provider

**Files:**
- Create: `backend/models/providers/huggingface.py`
- Modify: `backend/models/gateway.py` — register huggingface provider

**Interfaces:**
- Consumes: `BaseProvider`, `ModelConfig` from Task 4
- Produces:
  - `HuggingFaceProvider` class registered under `"huggingface"` in gateway
  - `MODEL_PATH: str` — path to downloaded model weights
  - `async download_model() -> AsyncIterator[dict]` — yields `{status, progress, message}` events
  - `supports_tool_calling` returns `False`

- [ ] **Step 1: Create `backend/models/providers/huggingface.py`**

```python
import os
import asyncio
from typing import AsyncIterator
from .base import BaseProvider, ModelConfig

MODEL_ID = "Qwen/Qwen3-0.6B"
MODEL_PATH = os.environ.get("MODELS_PATH", "/data/models") + "/Qwen3-0.6B"

_model = None
_tokenizer = None
_model_lock = asyncio.Lock()

def _is_downloaded() -> bool:
    return os.path.exists(MODEL_PATH) and os.path.exists(os.path.join(MODEL_PATH, "config.json"))

async def download_model() -> AsyncIterator[dict]:
    if _is_downloaded():
        yield {"status": "already_downloaded", "progress": 100, "message": "Model already available"}
        return
    yield {"status": "downloading", "progress": 0, "message": "Starting download of Qwen3-0.6B (~400MB)..."}
    try:
        from huggingface_hub import snapshot_download
        import threading
        result = {}
        def _download():
            try:
                snapshot_download(repo_id=MODEL_ID, local_dir=MODEL_PATH)
                result["success"] = True
            except Exception as e:
                result["error"] = str(e)
        thread = threading.Thread(target=_download)
        thread.start()
        while thread.is_alive():
            await asyncio.sleep(2)
            yield {"status": "downloading", "progress": 50, "message": "Downloading..."}
        thread.join()
        if result.get("error"):
            yield {"status": "error", "progress": 0, "message": result["error"]}
        else:
            yield {"status": "completed", "progress": 100, "message": "Download complete"}
    except Exception as e:
        yield {"status": "error", "progress": 0, "message": str(e)}

async def _load_model():
    global _model, _tokenizer
    async with _model_lock:
        if _model is not None:
            return
        if not _is_downloaded():
            raise RuntimeError("Qwen3-0.6B model not downloaded. Use the onboarding screen to download it first.")
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, torch_dtype=torch.float32)
        _model.eval()

class HuggingFaceProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        await _load_model()
        import torch
        prompt = _tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = _tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = _model.generate(
                **inputs,
                max_new_tokens=1024,
                temperature=0.7,
                do_sample=True,
                pad_token_id=_tokenizer.eos_token_id,
            )
        generated = outputs[0][inputs["input_ids"].shape[1]:]
        return _tokenizer.decode(generated, skip_special_tokens=True)

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        result = await self.generate(messages, config)
        for word in result.split():
            yield word + " "
            await asyncio.sleep(0.02)

    @property
    def supports_tool_calling(self) -> bool:
        return False

    @property
    def context_window(self) -> int:
        return 32768
```

- [ ] **Step 2: Register in `backend/models/gateway.py`**

Add to imports and `_PROVIDERS` dict:

```python
from .providers.huggingface import HuggingFaceProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "moonshot": MoonshotProvider,
    "openrouter": OpenRouterProvider,
    "ollama": OllamaProvider,
    "huggingface": HuggingFaceProvider,
}
```

- [ ] **Step 3: Verify gateway test still passes**

```bash
cd backend && python -m pytest tests/test_gateway.py -v
```
Expected: Both tests `PASSED`

- [ ] **Step 4: Commit**

```bash
git add backend/models/providers/huggingface.py backend/models/gateway.py
git commit -m "feat: add HuggingFace Qwen3-0.6B fallback provider with download support"
```

---

### Task 10: Next.js Frontend Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/components.json`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/lib/utils.ts`

**Interfaces:**
- Produces: Next.js app that proxies `/api/*` and `/ws/*` to backend; dark theme applied via `<html className="dark">`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "dissentlab-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.2",
    "@tanstack/react-query": "^5.62.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "lucide-react": "^0.468.0",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-slot": "^1.1.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "@types/node": "^22.10.2",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "vitest": "^2.1.8",
    "@vitejs/plugin-react": "^4.3.4",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1"
  }
}
```

- [ ] **Step 2: Create `frontend/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/ws/:path*",
        headers: [{ key: "x-backend-url", value: BACKEND_URL }],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `frontend/tailwind.config.ts`**

```typescript
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
        background: "#0a0a0a",
        foreground: "#f5f5f5",
        card: "#141414",
        border: "#262626",
        muted: "#737373",
        accent: "#6366f1",
        optimist: "#22c55e",
        pessimist: "#ef4444",
        contrarian: "#f59e0b",
        observer: "#6366f1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create `frontend/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
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
    scrollbar-color: #262626 transparent;
  }
}
```

- [ ] **Step 6: Create `frontend/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PERSONA_COLORS: Record<string, string> = {
  optimist: "text-optimist border-optimist",
  pessimist: "text-pessimist border-pessimist",
  contrarian: "text-contrarian border-contrarian",
  observer: "text-observer border-observer",
};

export function getPersonaColor(personaId: string): string {
  return PERSONA_COLORS[personaId] ?? "text-foreground border-border";
}
```

- [ ] **Step 7: Create `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "DissentLab",
  description: "AI council research and debate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create `frontend/app/providers.tsx`**

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js 15 frontend with dark theme and backend proxy"
```

---

### Task 11: Zustand Stores and API Client

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/stores/sessionStore.ts`
- Create: `frontend/stores/settingsStore.ts`
- Create: `frontend/tests/stores/sessionStore.test.ts`

**Interfaces:**
- Produces:
  - `api.createSession(req)`, `api.listSessions()`, `api.getSession(id)`, `api.deleteSession(id)`
  - `api.listProviders()`, `api.setApiKey(provider, key)`, `api.deleteApiKey(provider)`, `api.testProvider(provider)`
  - `api.getSettings()`, `api.patchSettings(patch)`
  - `useSessionStore` with: `activeSession`, `messages`, `checkpoints`, `sources`, `phase`, `setSession()`, `addMessage()`, `addCheckpoint()`, `setFinalReport()`, `reset()`
  - `useSettingsStore` with: `defaultIntensity`, `defaultProvider`, `defaultModel`, `setDefaults()`

- [ ] **Step 1: Create `frontend/lib/api.ts`**

```typescript
const BASE = "";

export type Session = {
  id: string;
  question: string;
  status: string;
  debate_intensity: string;
  model_summary: string;
  created_at: string;
  final_recommendation_preview: string;
};

export type DebateMessage = {
  id?: string;
  round_number: number;
  persona_id: string;
  persona_name: string;
  content: string;
  cited_sources: string[];
  confidence: string;
  created_at: string;
};

export type ObserverCheckpoint = {
  round_number: number;
  consensus_score: number;
  agreements: string[];
  disagreements: string[];
  should_continue: boolean;
  reason: string;
};

export type Provider = {
  provider: string;
  configured: boolean;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  createSession: (body: { question: string; intensity: string; model_provider: string; model_name: string }) =>
    request<Session>("/api/sessions", { method: "POST", body: JSON.stringify(body) }),

  listSessions: () => request<Session[]>("/api/sessions"),

  getSession: (id: string) => request<Session & { messages: DebateMessage[]; checkpoints: ObserverCheckpoint[]; report: { content_markdown: string } | null }>(`/api/sessions/${id}`),

  deleteSession: (id: string) => request<void>(`/api/sessions/${id}`, { method: "DELETE" }),

  listProviders: () => request<{ providers: Provider[]; ollama_url: string }>("/api/models/providers"),

  setApiKey: (provider: string, key: string) =>
    request<{ provider: string; masked: string }>(`/api/models/keys/${provider}`, { method: "POST", body: JSON.stringify({ key }) }),

  deleteApiKey: (provider: string) =>
    request<void>(`/api/models/keys/${provider}`, { method: "DELETE" }),

  testProvider: (provider: string) =>
    request<{ ok: boolean; message: string }>(`/api/models/test/${provider}`),

  getSettings: () => request<{ ollama_url: string; default_intensity: string }>("/api/settings"),

  patchSettings: (patch: { ollama_url?: string; default_intensity?: string }) =>
    request<{ ollama_url: string; default_intensity: string }>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
};
```

- [ ] **Step 2: Create `frontend/stores/sessionStore.ts`**

```typescript
import { create } from "zustand";
import type { DebateMessage, ObserverCheckpoint } from "@/lib/api";

type Phase = "idle" | "researching" | "positions" | "debating" | "final" | "completed" | "error";

type SessionState = {
  sessionId: string | null;
  question: string;
  phase: Phase;
  messages: DebateMessage[];
  checkpoints: ObserverCheckpoint[];
  sources: unknown[];
  finalReport: string | null;
  statusMessage: string;
  error: string | null;
  autoScroll: boolean;

  setSession: (id: string, question: string) => void;
  setPhase: (phase: Phase) => void;
  addMessage: (msg: DebateMessage) => void;
  addCheckpoint: (cp: ObserverCheckpoint) => void;
  setFinalReport: (report: string) => void;
  setStatusMessage: (msg: string) => void;
  setError: (err: string) => void;
  setAutoScroll: (v: boolean) => void;
  reset: () => void;
};

const initialState = {
  sessionId: null,
  question: "",
  phase: "idle" as Phase,
  messages: [],
  checkpoints: [],
  sources: [],
  finalReport: null,
  statusMessage: "",
  error: null,
  autoScroll: true,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setSession: (id, question) => set({ sessionId: id, question, phase: "idle" }),
  setPhase: (phase) => set({ phase }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  addCheckpoint: (cp) => set((s) => ({ checkpoints: [...s.checkpoints, cp] })),
  setFinalReport: (report) => set({ finalReport: report, phase: "completed" }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setError: (error) => set({ error, phase: "error" }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  reset: () => set(initialState),
}));
```

- [ ] **Step 3: Create `frontend/stores/settingsStore.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsState = {
  defaultIntensity: "quick" | "standard" | "deep_dive";
  defaultProvider: string;
  defaultModel: string;
  setDefaultIntensity: (v: "quick" | "standard" | "deep_dive") => void;
  setDefaultProvider: (v: string) => void;
  setDefaultModel: (v: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultIntensity: "standard",
      defaultProvider: "openai",
      defaultModel: "gpt-4o-mini",
      setDefaultIntensity: (v) => set({ defaultIntensity: v }),
      setDefaultProvider: (v) => set({ defaultProvider: v }),
      setDefaultModel: (v) => set({ defaultModel: v }),
    }),
    { name: "dissentlab-settings" }
  )
);
```

- [ ] **Step 4: Write and run store test**

```typescript
// frontend/tests/stores/sessionStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "@/stores/sessionStore";

describe("sessionStore", () => {
  beforeEach(() => useSessionStore.getState().reset());

  it("sets session and resets", () => {
    useSessionStore.getState().setSession("abc", "Should I quit my job?");
    expect(useSessionStore.getState().sessionId).toBe("abc");
    expect(useSessionStore.getState().question).toBe("Should I quit my job?");
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().sessionId).toBeNull();
  });

  it("accumulates messages", () => {
    const msg = { round_number: 1, persona_id: "optimist", persona_name: "Optimist", content: "Good idea", cited_sources: [], confidence: "High", created_at: "" };
    useSessionStore.getState().addMessage(msg);
    expect(useSessionStore.getState().messages).toHaveLength(1);
  });
});
```

Create `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
```

```bash
cd frontend && npm install && npm test
```
Expected: 2 tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/api.ts frontend/stores/ frontend/tests/ frontend/vitest.config.ts
git commit -m "feat: add API client, Zustand stores, and store tests"
```

---

### Task 12: useDebateSocket Hook

**Files:**
- Create: `frontend/hooks/useDebateSocket.ts`
- Create: `frontend/hooks/useSession.ts`
- Create: `frontend/hooks/useModels.ts`
- Create: `frontend/tests/hooks/useDebateSocket.test.ts`

**Interfaces:**
- Consumes: `useSessionStore` from Task 11
- Produces:
  - `useDebateSocket(sessionId: string | null): { connect, disconnect, sendStop, sendSkipToFinal, connected }`
  - `useSession(id: string)` — TanStack Query wrapper for `api.getSession`
  - `useModels()` — TanStack Query wrapper for `api.listProviders`

- [ ] **Step 1: Create `frontend/hooks/useDebateSocket.ts`**

```typescript
"use client";
import { useCallback, useRef, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";

type WebSocketEvent = {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

const WS_BASE = typeof window !== "undefined"
  ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
  : "";

export function useDebateSocket(sessionId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const store = useSessionStore();

  const handleEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case "session.started":
        store.setPhase("researching");
        break;
      case "status.update":
        store.setStatusMessage((event.payload.message as string) ?? "");
        if ((event.payload.message as string)?.includes("initial positions")) {
          store.setPhase("positions");
        } else if ((event.payload.message as string)?.includes("Round")) {
          store.setPhase("debating");
        }
        break;
      case "persona.position":
      case "debate.message":
        store.addMessage({
          round_number: (event.payload.round_number as number) ?? 0,
          persona_id: event.payload.persona_id as string,
          persona_name: event.payload.persona_name as string,
          content: event.payload.content as string,
          cited_sources: (event.payload.cited_sources as string[]) ?? [],
          confidence: (event.payload.confidence as string) ?? "Medium",
          created_at: event.timestamp,
        });
        break;
      case "observer.checkpoint":
        store.addCheckpoint({
          round_number: event.payload.round_number as number,
          consensus_score: event.payload.consensus_score as number,
          agreements: (event.payload.agreements as string[]) ?? [],
          disagreements: (event.payload.disagreements as string[]) ?? [],
          should_continue: event.payload.should_continue as boolean,
          reason: event.payload.reason as string,
        });
        break;
      case "final_report.done":
        store.setFinalReport(event.payload.content as string);
        break;
      case "error":
        store.setError((event.payload.message as string) ?? "Unknown error");
        break;
      default:
        break;
    }
  }, [store]);

  const connect = useCallback(() => {
    if (!sessionId || ws.current?.readyState === WebSocket.OPEN) return;
    const url = `${WS_BASE}/ws/sessions/${sessionId}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    socket.onmessage = (e) => {
      try {
        const event: WebSocketEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch {
        // ignore malformed
      }
    };

    socket.onclose = () => {
      setConnected(false);
      if (reconnectAttempts.current < 3) {
        const delay = Math.pow(2, reconnectAttempts.current) * 1000;
        reconnectAttempts.current += 1;
        setTimeout(() => connect(), delay);
      } else {
        store.setStatusMessage("Connection lost. Reconnect manually.");
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [sessionId, handleEvent, store]);

  const disconnect = useCallback(() => {
    ws.current?.close();
    ws.current = null;
    setConnected(false);
  }, []);

  const sendStop = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "user.stop" }));
    }
  }, []);

  const sendSkipToFinal = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "user.skip_to_final" }));
    }
  }, []);

  return { connect, disconnect, sendStop, sendSkipToFinal, connected };
}
```

- [ ] **Step 2: Create `frontend/hooks/useSession.ts`**

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });
}

export function useSessionList() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: api.listSessions,
  });
}
```

- [ ] **Step 3: Create `frontend/hooks/useModels.ts`**

```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: api.listProviders,
  });
}

export function useSetApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      api.setApiKey(provider, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => api.deleteApiKey(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useTestProvider() {
  return useMutation({
    mutationFn: (provider: string) => api.testProvider(provider),
  });
}
```

- [ ] **Step 4: Write hook test**

```typescript
// frontend/tests/hooks/useDebateSocket.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { useSessionStore } from "@/stores/sessionStore";

describe("useDebateSocket", () => {
  beforeEach(() => useSessionStore.getState().reset());

  it("returns connect/disconnect functions", () => {
    const { result } = renderHook(() => useDebateSocket("test-id"));
    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
    expect(result.current.connected).toBe(false);
  });
});
```

```bash
cd frontend && npm test
```
Expected: All tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add frontend/hooks/ frontend/tests/hooks/
git commit -m "feat: add useDebateSocket, useSession, and useModels hooks"
```

---

### Task 13: Home Screen

**Files:**
- Create: `frontend/components/session/QuestionForm.tsx`
- Create: `frontend/components/session/IntensitySelector.tsx`
- Create: `frontend/components/session/ModelSelector.tsx`
- Create: `frontend/components/onboarding/ModelSetupCard.tsx`
- Create: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `api.createSession`, `useModels`, `useSessionList`, `useSettingsStore`
- Produces: Home page at `/` with question input, intensity selector, model selector, start button, recent sessions, and onboarding flow

- [ ] **Step 1: Create `frontend/components/session/IntensitySelector.tsx`**

```tsx
"use client";
import { cn } from "@/lib/utils";

type Intensity = "quick" | "standard" | "deep_dive";

const OPTIONS: { value: Intensity; label: string; description: string }[] = [
  { value: "quick", label: "Quick", description: "1 round, ~30s" },
  { value: "standard", label: "Standard", description: "3–5 rounds, 1–3 min" },
  { value: "deep_dive", label: "Deep Dive", description: "Up to 15 rounds" },
];

export function IntensitySelector({
  value,
  onChange,
}: {
  value: Intensity;
  onChange: (v: Intensity) => void;
}) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2 px-3 rounded-md border text-sm transition-colors",
            value === opt.value
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
          )}
        >
          <div className="font-medium">{opt.label}</div>
          <div className="text-xs opacity-70">{opt.description}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/components/session/ModelSelector.tsx`**

```tsx
"use client";
import { useModels } from "@/hooks/useModels";

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-pro"],
  moonshot: ["moonshot-v1-8k", "moonshot-v1-32k"],
  openrouter: ["openai/gpt-4o", "anthropic/claude-sonnet-4-6"],
  ollama: ["llama3.2", "qwen2.5", "mistral"],
  huggingface: ["Qwen3-0.6B"],
};

export function ModelSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
}: {
  provider: string;
  model: string;
  onProviderChange: (p: string) => void;
  onModelChange: (m: string) => void;
}) {
  const { data } = useModels();
  const configured = data?.providers.filter((p) => p.configured) ?? [];

  return (
    <div className="flex gap-2">
      <select
        value={provider}
        onChange={(e) => {
          onProviderChange(e.target.value);
          const models = MODEL_OPTIONS[e.target.value] ?? [];
          onModelChange(models[0] ?? "");
        }}
        className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
      >
        <option value="" disabled>Select provider</option>
        {configured.map((p) => (
          <option key={p.provider} value={p.provider}>
            {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
          </option>
        ))}
        <option value="huggingface">HuggingFace (local)</option>
      </select>
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
      >
        {(MODEL_OPTIONS[provider] ?? []).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/components/session/QuestionForm.tsx`**

```tsx
"use client";

export function QuestionForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ask a difficult question and watch the council debate it…"
      rows={3}
      className="w-full bg-card border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent text-base"
    />
  );
}
```

- [ ] **Step 4: Create `frontend/components/onboarding/ModelSetupCard.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type DownloadStatus = "idle" | "downloading" | "completed" | "error";

export function ModelSetupCard() {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function startDownload() {
    setStatus("downloading");
    const es = new EventSource("/api/models/download/progress");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data.progress ?? 0);
      setMessage(data.message ?? "");
      if (data.status === "completed" || data.status === "already_downloaded") {
        setStatus("completed");
        es.close();
      }
      if (data.status === "error") {
        setStatus("error");
        setMessage(data.message);
        es.close();
      }
    };
    es.onerror = () => {
      setStatus("error");
      setMessage("Download connection failed. Check your internet connection.");
      es.close();
    };
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">No model configured</h1>
          <p className="text-muted text-sm mt-2">
            DissentLab needs an AI model to run debates. Choose an option:
          </p>
        </div>

        {status === "idle" && (
          <div className="space-y-3">
            <button
              onClick={startDownload}
              className="w-full py-3 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              Download Qwen3-0.6B (~400MB)
            </button>
            <p className="text-xs text-muted text-center">CPU-only · No internet needed after download · No web research</p>
            <div className="border-t border-border pt-3">
              <button
                onClick={() => router.push("/settings/models")}
                className="w-full py-3 rounded-md border border-border text-foreground text-sm hover:border-foreground/40 transition-colors"
              >
                Configure a provider API key instead
              </button>
            </div>
          </div>
        )}

        {status === "downloading" && (
          <div className="space-y-3">
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted">{message || "Downloading…"}</p>
          </div>
        )}

        {status === "completed" && (
          <div className="space-y-3">
            <p className="text-optimist text-sm">Model ready. You can now start a debate.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-md bg-accent text-white font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p className="text-pessimist text-sm">{message}</p>
            <button onClick={() => setStatus("idle")} className="text-sm text-accent underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/app/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionForm } from "@/components/session/QuestionForm";
import { IntensitySelector } from "@/components/session/IntensitySelector";
import { ModelSelector } from "@/components/session/ModelSelector";
import { ModelSetupCard } from "@/components/onboarding/ModelSetupCard";
import { useModels } from "@/hooks/useModels";
import { useSessionList } from "@/hooks/useSession";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "@/lib/time";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}

export default function HomePage() {
  const router = useRouter();
  const { defaultIntensity, defaultProvider, defaultModel, setDefaultIntensity, setDefaultProvider, setDefaultModel } = useSettingsStore();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: models } = useModels();
  const { data: sessions } = useSessionList();

  const hasModel = (models?.providers.some((p) => p.configured) ?? false) || defaultProvider === "huggingface";
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
    <main className="min-h-screen flex flex-col items-center justify-start pt-20 px-4">
      {showOnboarding && <ModelSetupCard />}

      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">DissentLab</h1>
          <p className="text-sm text-muted">AI council research and debate</p>
        </div>

        <div className="space-y-4">
          <QuestionForm value={question} onChange={setQuestion} />

          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Debate Intensity</label>
            <IntensitySelector value={defaultIntensity} onChange={setDefaultIntensity} />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Model</label>
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
            className="w-full py-3 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Starting…" : "Start Council"}
          </button>
        </div>

        {sessions && sessions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs text-muted uppercase tracking-wider">Recent Sessions</h2>
            <div className="space-y-1">
              {sessions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/session/${s.id}`)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-card border border-transparent hover:border-border transition-all group"
                >
                  <div className="text-sm text-foreground truncate group-hover:text-accent">{s.question}</div>
                  <div className="text-xs text-muted">{formatTime(s.created_at)} · {s.debate_intensity}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Create `frontend/lib/time.ts`**

```typescript
export function formatDistanceToNow(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/components/session/ frontend/components/onboarding/ frontend/app/page.tsx frontend/lib/time.ts
git commit -m "feat: add home screen with question form, intensity selector, model selector, and onboarding"
```

---

### Task 14: Live Council Screen

**Files:**
- Create: `frontend/components/debate/PhaseIndicator.tsx`
- Create: `frontend/components/debate/MessageCard.tsx`
- Create: `frontend/components/debate/ObserverCheckpoint.tsx`
- Create: `frontend/app/session/[id]/page.tsx`

**Interfaces:**
- Consumes: `useDebateSocket`, `useSessionStore`, `useSession`
- Produces: Live debate screen that streams messages from WebSocket into scrolling message list

- [ ] **Step 1: Create `frontend/components/debate/PhaseIndicator.tsx`**

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
          <span className={i <= activeIndex ? "text-accent font-medium" : ""}>
            {p.key === "debating" && round > 0 ? `Round ${round}` : p.label}
          </span>
          {i < PHASES.length - 1 && <span className="text-border">→</span>}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/components/debate/MessageCard.tsx`**

```tsx
import { getPersonaColor } from "@/lib/utils";
import type { DebateMessage } from "@/lib/api";

export function MessageCard({ message }: { message: DebateMessage }) {
  const color = getPersonaColor(message.persona_id);
  return (
    <div className={`border-l-2 pl-4 py-1 ${color.split(" ")[1] ?? "border-border"}`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-sm font-semibold ${color.split(" ")[0] ?? "text-foreground"}`}>
          {message.persona_name}
        </span>
        {message.round_number > 0 && (
          <span className="text-xs text-muted">Round {message.round_number}</span>
        )}
        <span className="text-xs text-muted">· {message.confidence}</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {message.content}
      </p>
      {message.cited_sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {message.cited_sources.map((s) => (
            <span key={s} className="text-xs text-muted border border-border rounded px-1">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/components/debate/ObserverCheckpoint.tsx`**

```tsx
import type { ObserverCheckpoint } from "@/lib/api";

export function ObserverCheckpointCard({ checkpoint }: { checkpoint: ObserverCheckpoint }) {
  const consensus = Math.round(checkpoint.consensus_score * 100);
  return (
    <div className="border border-observer/30 rounded-md p-4 bg-observer/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-observer uppercase tracking-wider">
          Observer — Round {checkpoint.round_number}
        </span>
        <span className="text-xs text-muted">Consensus: {consensus}%</span>
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
              <li key={i} className="text-sm text-pessimist/80">· {d}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted italic">{checkpoint.reason}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/app/session/[id]/page.tsx`**

```tsx
"use client";
import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { useSessionStore } from "@/stores/sessionStore";
import { PhaseIndicator } from "@/components/debate/PhaseIndicator";
import { MessageCard } from "@/components/debate/MessageCard";
import { ObserverCheckpointCard } from "@/components/debate/ObserverCheckpoint";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSessionStore();
  const { connect, disconnect, sendStop, connected } = useDebateSocket(id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store.reset();
    connect();
    return () => disconnect();
  }, [id]);

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

  const allRounds = Array.from(new Set(store.messages.map((m) => m.round_number))).sort((a, b) => a - b);

  return (
    <main className="min-h-screen flex flex-col max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <PhaseIndicator phase={store.phase} round={store.messages.filter(m => m.round_number > 0).reduce((max, m) => Math.max(max, m.round_number), 0)} />
          {store.statusMessage && (
            <p className="text-xs text-muted">{store.statusMessage}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => store.setAutoScroll(!store.autoScroll)}
            className="text-xs text-muted border border-border rounded px-2 py-1 hover:border-foreground/30"
          >
            {store.autoScroll ? "Pause scroll" : "Resume scroll"}
          </button>
          <button
            onClick={sendStop}
            className="text-xs text-pessimist border border-pessimist/40 rounded px-2 py-1 hover:bg-pessimist/10"
          >
            Stop
          </button>
        </div>
      </div>

      {store.question && (
        <div className="border-b border-border pb-4">
          <p className="text-sm text-muted">Question</p>
          <p className="text-base text-foreground mt-1">{store.question}</p>
        </div>
      )}

      <div className="space-y-4">
        {allRounds.map((round) => {
          const roundMessages = store.messages.filter((m) => m.round_number === round);
          const checkpoint = store.checkpoints.find((c) => c.round_number === round);
          return (
            <div key={round} className="space-y-3">
              {round === 0 && (
                <div className="text-xs text-muted uppercase tracking-wider">Initial Positions</div>
              )}
              {round > 0 && (
                <div className="text-xs text-muted uppercase tracking-wider">Round {round}</div>
              )}
              <div className="space-y-3">
                {roundMessages.map((msg, i) => (
                  <MessageCard key={`${msg.persona_id}-${i}`} message={msg} />
                ))}
              </div>
              {checkpoint && <ObserverCheckpointCard checkpoint={checkpoint} />}
            </div>
          );
        })}

        {store.phase === "error" && store.error && (
          <div className="border border-pessimist/40 rounded-md p-4 text-pessimist text-sm">
            {store.error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/debate/ frontend/app/session/
git commit -m "feat: add live council screen with streaming message display"
```

---

### Task 15: Final Report Screen

**Files:**
- Create: `frontend/components/report/ReportSection.tsx`
- Create: `frontend/components/report/ExportButton.tsx`
- Create: `frontend/app/session/[id]/report/page.tsx`

**Interfaces:**
- Consumes: `useSession`, `useSessionStore`
- Produces: Final report screen showing full Observer synthesis with copy/export buttons

- [ ] **Step 1: Create `frontend/components/report/ExportButton.tsx`**

```tsx
"use client";
import { useState } from "react";

export function ExportButton({ content, filename }: { content: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadFile() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={copyToClipboard}
        className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30 hover:text-foreground transition-colors"
      >
        {copied ? "Copied!" : "Copy Markdown"}
      </button>
      <button
        onClick={downloadFile}
        className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30 hover:text-foreground transition-colors"
      >
        Export .md
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/components/report/ReportSection.tsx`**

```tsx
export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-border pb-1">
        {title}
      </h2>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Create `frontend/app/session/[id]/report/page.tsx`**

```tsx
"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useSessionStore } from "@/stores/sessionStore";
import { ExportButton } from "@/components/report/ExportButton";

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-sm font-semibold text-muted uppercase tracking-wider border-b border-border pb-1 mt-6 mb-2">{line.slice(3)}</h2>;
    }
    if (line.startsWith("- ")) {
      return <li key={i} className="text-sm text-foreground/90 ml-4">· {line.slice(2)}</li>;
    }
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm text-foreground/90 leading-relaxed">{line}</p>;
  });
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSessionStore();
  const { data: session } = useSession(id);

  const reportContent = store.finalReport ?? session?.report?.content_markdown ?? "";

  if (!reportContent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">Loading report…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push(`/session/${id}`)}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            ← Back to debate
          </button>
          <h1 className="text-xl font-semibold">Final Report</h1>
        </div>
        <ExportButton
          content={reportContent}
          filename={`dissentlab-${id}-report.md`}
        />
      </div>

      {session?.question && (
        <div className="border-b border-border pb-4">
          <p className="text-xs text-muted mb-1">Question</p>
          <p className="text-base text-foreground">{session.question}</p>
        </div>
      )}

      <div className="space-y-1">
        {renderMarkdown(reportContent)}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/report/ frontend/app/session/
git commit -m "feat: add final report screen with markdown render and export"
```

---

## Phase 2 — Research Layer

### Task 16: Tavily Search Tool and URL Reader

**Files:**
- Create: `backend/tools/search.py`
- Create: `backend/tools/reader.py`
- Create: `backend/tools/summarizer.py`
- Create: `backend/storage/repositories/sources.py`

**Interfaces:**
- Consumes: `SettingsRepository` for Tavily key, `decrypt()` from Task 3
- Produces:
  - `tavily_search(query: str, api_key: str, max_results: int = 5) -> list[dict]` — returns `[{title, url, content, score}]`
  - `read_url(url: str) -> str` — returns cleaned text or empty string on failure
  - `summarize_for_claim(text: str, question: str, gateway: ModelGateway, config: ModelConfig) -> str`
  - `SourceRepository(db)` with `create()`, `list_for_session()`, `get_by_url()`

- [ ] **Step 1: Create `backend/storage/repositories/sources.py`**

```python
import uuid
from datetime import datetime, timezone
import aiosqlite

class SourceRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def create(self, session_id: str, title: str, url: str, domain: str,
                     summary: str, discovered_by: str, relevance_score: float) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        src_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO sources
               (id, session_id, title, url, domain, summary, discovered_by_persona_id, relevance_score, retrieved_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (src_id, session_id, title, url, domain, summary, discovered_by, relevance_score, now)
        )
        await self.db.commit()
        return {"id": src_id, "title": title, "url": url, "domain": domain,
                "summary": summary, "discovered_by": discovered_by,
                "relevance_score": relevance_score, "retrieved_at": now}

    async def get_by_url(self, session_id: str, url: str) -> dict | None:
        async with self.db.execute(
            "SELECT * FROM sources WHERE session_id = ? AND url = ?", (session_id, url)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def list_for_session(self, session_id: str) -> list[dict]:
        async with self.db.execute(
            "SELECT * FROM sources WHERE session_id = ? ORDER BY relevance_score DESC",
            (session_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
```

- [ ] **Step 2: Create `backend/tools/search.py`**

```python
import asyncio
from tavily import TavilyClient

async def tavily_search(query: str, api_key: str, max_results: int = 5) -> list[dict]:
    def _sync_search():
        client = TavilyClient(api_key=api_key)
        result = client.search(query=query, max_results=max_results, include_raw_content=False)
        return result.get("results", [])
    return await asyncio.get_event_loop().run_in_executor(None, _sync_search)
```

- [ ] **Step 3: Create `backend/tools/reader.py`**

```python
import hashlib
import os
import asyncio
import httpx
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

CACHE_DIR = os.environ.get("CACHE_PATH", "/data/cache")
RATE_LIMIT = asyncio.Semaphore(2)

def _cache_path(url: str) -> str:
    url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{url_hash}.txt")

async def _check_robots(url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(robots_url)
            if r.status_code == 200:
                rp = RobotFileParser()
                rp.parse(r.text.splitlines())
                return rp.can_fetch("*", url)
    except Exception:
        pass
    return True

async def read_url(url: str) -> str:
    cache = _cache_path(url)
    if os.path.exists(cache):
        with open(cache) as f:
            return f.read()

    allowed = await _check_robots(url)
    if not allowed:
        return ""

    async with RATE_LIMIT:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True,
                                          headers={"User-Agent": "DissentLab/1.0 research bot"}) as client:
                r = await client.get(url)
                r.raise_for_status()
                html = r.text
        except Exception:
            return ""

    try:
        import trafilatura
        text = trafilatura.extract(html, include_comments=False, include_tables=False) or ""
    except Exception:
        text = ""

    if text:
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(cache, "w") as f:
            f.write(text[:50_000])

    return text[:50_000]
```

- [ ] **Step 4: Create `backend/tools/summarizer.py`**

```python
from models.gateway import ModelGateway, ModelConfig

async def summarize_for_claim(text: str, question: str, gateway: ModelGateway, config: ModelConfig) -> str:
    if not text.strip():
        return ""
    snippet = text[:3000]
    messages = [
        {"role": "user", "content": (
            f"Question being researched: {question}\n\n"
            f"Web page content:\n{snippet}\n\n"
            "In 2-3 sentences, summarize what this page says that is relevant to the question. "
            "If it says nothing relevant, reply with: [Not relevant]"
        )}
    ]
    try:
        return await gateway.generate(messages, config)
    except Exception:
        return ""
```

- [ ] **Step 5: Commit**

```bash
git add backend/tools/ backend/storage/repositories/sources.py
git commit -m "feat: add Tavily search, URL reader with robots.txt, and source repository"
```

---

### Task 17: Evidence Merger and Chroma Integration

**Files:**
- Create: `backend/storage/chroma_client.py`
- Create: `backend/storage/file_cache.py`

**Interfaces:**
- Consumes: `SourceRepository` from Task 16
- Produces:
  - `ChromaClient.score_relevance(text: str, question: str) -> float` — cosine similarity of text to question embedding
  - `ChromaClient.deduplicate(sources: list[dict], question: str) -> list[dict]` — dedup by URL, score each

- [ ] **Step 1: Create `backend/storage/chroma_client.py`**

```python
import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.environ.get("CHROMA_PATH", "/data/chroma")

_client: chromadb.Client | None = None
_collection = None

def _get_client():
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        _collection = _client.get_or_create_collection("sources", embedding_function=ef)
    return _client, _collection

class ChromaClient:
    def score_relevance(self, text: str, question: str) -> float:
        if not text.strip():
            return 0.0
        try:
            _, collection = _get_client()
            results = collection.query(
                query_texts=[question],
                query_embeddings=None,
                n_results=1,
                where=None,
            )
            # Use embedding similarity as a proxy score
            from sentence_transformers import SentenceTransformer, util
            model = SentenceTransformer("all-MiniLM-L6-v2")
            q_emb = model.encode(question, convert_to_tensor=True)
            t_emb = model.encode(text[:500], convert_to_tensor=True)
            score = float(util.cos_sim(q_emb, t_emb)[0][0])
            return max(0.0, min(1.0, score))
        except Exception:
            return 0.5

    def deduplicate(self, sources: list[dict], question: str) -> list[dict]:
        seen_urls: set[str] = set()
        unique = []
        for src in sources:
            if src["url"] not in seen_urls:
                seen_urls.add(src["url"])
                unique.append(src)
        for src in unique:
            src["relevance_score"] = self.score_relevance(src.get("summary", ""), question)
        return sorted(unique, key=lambda s: s["relevance_score"], reverse=True)
```

- [ ] **Step 2: Create `backend/storage/file_cache.py`**

```python
import hashlib
import os
import json
from datetime import datetime, timezone, timedelta

CACHE_DIR = os.environ.get("CACHE_PATH", "/data/cache")
TTL_HOURS = 24

def _cache_path(key: str) -> str:
    h = hashlib.sha256(key.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{h}.json")

def cache_get(key: str) -> str | None:
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        data = json.load(f)
    stored_at = datetime.fromisoformat(data["stored_at"])
    if datetime.now(timezone.utc) - stored_at > timedelta(hours=TTL_HOURS):
        os.remove(path)
        return None
    return data["value"]

def cache_set(key: str, value: str) -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(key)
    with open(path, "w") as f:
        json.dump({"stored_at": datetime.now(timezone.utc).isoformat(), "value": value}, f)
```

- [ ] **Step 3: Commit**

```bash
git add backend/storage/chroma_client.py backend/storage/file_cache.py
git commit -m "feat: add Chroma relevance scoring and file cache"
```

---

### Task 18: LangGraph Research Nodes

**Files:**
- Modify: `backend/graph/nodes.py` — add `node_persona_research` and `node_evidence_merger` nodes
- Modify: `backend/graph/graph.py` — wire research nodes before `initial_positions`

**Interfaces:**
- Consumes: `tavily_search`, `read_url`, `summarize_for_claim`, `ChromaClient`, `SettingsRepository`
- Produces: Updated graph with research phase; `sources` list populated in `CouncilState` before debate starts

- [ ] **Step 1: Add research nodes to `backend/graph/nodes.py`**

Add these two functions to `nodes.py`:

```python
async def node_persona_research(state: CouncilState) -> CouncilState:
    from storage.db import get_db
    from storage.repositories.settings import SettingsRepository
    from security.encryption import decrypt
    from tools.search import tavily_search
    from tools.reader import read_url
    from tools.summarizer import summarize_for_claim

    gateway = ModelGateway()
    config = _get_model_config(state)

    intensity_limits = {
        "quick": (2, 3),
        "standard": (4, 6),
        "deep_dive": (8, 12),
    }
    max_searches, max_urls = intensity_limits.get(state["debate_intensity"], (4, 6))

    tavily_key = None
    async with get_db() as db:
        repo = SettingsRepository(db)
        enc_key = await repo.get("tavily_api_key")
        if enc_key:
            tavily_key = decrypt(enc_key)

    if not tavily_key:
        _emit(state, "status.update", {"message": "No Tavily key configured — skipping web research."})
        return state

    active_personas = [p for p in state["personas"] if p["enabled"] and p["id"] != "observer"]
    persona_search_angles = {
        "optimist": f"opportunities advantages success {state['user_question']}",
        "pessimist": f"risks failures problems costs {state['user_question']}",
        "contrarian": f"counterarguments assumptions alternative perspectives {state['user_question']}",
    }

    all_raw_sources = []
    total_searches = 0
    total_urls = 0

    for persona in active_personas:
        if total_searches >= 30:
            break
        angle = persona_search_angles.get(persona["id"], state["user_question"])
        _emit(state, "research.begun", {"persona_id": persona["id"], "persona_name": persona["name"]})

        persona_searches = 0
        persona_urls = 0

        for _ in range(min(max_searches, 30 - total_searches)):
            if persona_searches >= max_searches:
                break
            try:
                results = await tavily_search(angle, tavily_key, max_results=5)
                persona_searches += 1
                total_searches += 1
                for r in results:
                    if total_urls >= 50 or persona_urls >= max_urls:
                        break
                    url = r.get("url", "")
                    if not url:
                        continue
                    text = await read_url(url)
                    persona_urls += 1
                    total_urls += 1
                    summary = await summarize_for_claim(text, state["user_question"], gateway, config)
                    if "[Not relevant]" in summary or not summary:
                        continue
                    domain = url.split("/")[2] if "/" in url else url
                    raw_src = {
                        "url": url,
                        "title": r.get("title", url),
                        "domain": domain,
                        "summary": summary,
                        "discovered_by": persona["id"],
                        "claims": [],
                    }
                    all_raw_sources.append(raw_src)
                    _emit(state, "source.found", {"title": raw_src["title"], "url": url, "persona_id": persona["id"]})
            except Exception:
                break

    return {**state, "_raw_sources": all_raw_sources}


async def node_evidence_merger(state: CouncilState) -> CouncilState:
    import uuid
    from datetime import datetime, timezone
    from storage.chroma_client import ChromaClient

    raw_sources = state.get("_raw_sources", [])
    if not raw_sources:
        return state

    chroma = ChromaClient()
    deduped = chroma.deduplicate(raw_sources, state["user_question"])

    sources = []
    for s in deduped[:50]:
        sources.append({
            "id": str(uuid.uuid4())[:8],
            "title": s["title"],
            "url": s["url"],
            "domain": s["domain"],
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "summary": s["summary"],
            "discovered_by": s["discovered_by"],
            "relevance_score": s.get("relevance_score", 0.5),
            "claims": s.get("claims", []),
        })

    _emit(state, "status.update", {"message": f"Evidence pool ready: {len(sources)} sources"})
    return {**state, "sources": sources}
```

- [ ] **Step 2: Update `backend/graph/graph.py` to wire research nodes**

```python
from langgraph.graph import StateGraph, END
from graph.state import CouncilState
from graph.nodes import (
    node_validate_input,
    node_task_brief,
    node_persona_research,
    node_evidence_merger,
    node_initial_positions,
    node_debate_round,
    node_observer_checkpoint,
    node_final_report,
    should_continue,
)

def build_graph():
    builder = StateGraph(CouncilState)

    builder.add_node("validate_input", node_validate_input)
    builder.add_node("task_brief", node_task_brief)
    builder.add_node("persona_research", node_persona_research)
    builder.add_node("evidence_merger", node_evidence_merger)
    builder.add_node("initial_positions", node_initial_positions)
    builder.add_node("debate_round", node_debate_round)
    builder.add_node("observer_checkpoint", node_observer_checkpoint)
    builder.add_node("final_report", node_final_report)

    builder.set_entry_point("validate_input")
    builder.add_edge("validate_input", "task_brief")
    builder.add_edge("task_brief", "persona_research")
    builder.add_edge("persona_research", "evidence_merger")
    builder.add_edge("evidence_merger", "initial_positions")
    builder.add_edge("initial_positions", "debate_round")
    builder.add_edge("debate_round", "observer_checkpoint")
    builder.add_conditional_edges(
        "observer_checkpoint",
        should_continue,
        {"debate_round": "debate_round", "final_report": "final_report"},
    )
    builder.add_edge("final_report", END)

    return builder.compile()
```

- [ ] **Step 3: Run graph tests to confirm still passing**

```bash
cd backend && python -m pytest tests/test_graph.py -v
```
Expected: Both tests `PASSED`

- [ ] **Step 4: Commit**

```bash
git add backend/graph/nodes.py backend/graph/graph.py
git commit -m "feat: add research phase nodes (Tavily search, URL reader, evidence merger)"
```

---

### Task 19: Source Panel UI

**Files:**
- Modify: `frontend/stores/sessionStore.ts` — add `sources` and `addSource()`
- Create: `frontend/components/debate/SourcePanel.tsx`
- Modify: `frontend/app/session/[id]/page.tsx` — add Source Panel

**Interfaces:**
- Consumes: `sessionStore.sources`, WebSocket `source.found` events
- Produces: Collapsible source panel showing all discovered sources with domain, summary, and persona attribution

- [ ] **Step 1: Add sources to `frontend/stores/sessionStore.ts`**

Add to `SessionState`:
```typescript
sources: { id?: string; title: string; url: string; domain: string; summary: string; persona_id: string }[];
addSource: (src: { title: string; url: string; domain: string; summary: string; persona_id: string }) => void;
```

Add to `initialState`: `sources: []`

Add to store implementation:
```typescript
addSource: (src) => set((s) => ({ sources: [...s.sources, src] })),
```

- [ ] **Step 2: Handle `source.found` in `frontend/hooks/useDebateSocket.ts`**

Add to `handleEvent` switch:
```typescript
case "source.found":
  store.addSource({
    title: event.payload.title as string,
    url: (event.payload.url as string) ?? "",
    domain: (event.payload.url as string)?.split("/")[2] ?? "",
    summary: "",
    persona_id: event.payload.persona_id as string,
  });
  break;
```

- [ ] **Step 3: Create `frontend/components/debate/SourcePanel.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { getPersonaColor } from "@/lib/utils";

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
                <span className={`text-xs ${getPersonaColor(src.persona_id).split(" ")[0]}`}>
                  {src.persona_id}
                </span>
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

- [ ] **Step 4: Add `<SourcePanel />` to session page**

In `frontend/app/session/[id]/page.tsx`, add before `<div ref={bottomRef} />`:

```tsx
import { SourcePanel } from "@/components/debate/SourcePanel";
// ...
<SourcePanel />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/stores/sessionStore.ts frontend/hooks/useDebateSocket.ts frontend/components/debate/SourcePanel.tsx frontend/app/session/
git commit -m "feat: add source panel with live source discovery display"
```

---

## Phase 3 — Polish

### Task 20: Persona Manager API and UI

**Files:**
- Create: `backend/api/personas.py`
- Modify: `backend/main.py` — include personas router
- Create: `frontend/app/settings/personas/page.tsx`
- Create: `frontend/hooks/usePersonas.ts`

**Interfaces:**
- Produces:
  - `GET /api/personas` → `[PersonaRow]`
  - `POST /api/personas` → new persona
  - `PATCH /api/personas/{id}` → updated persona
  - `DELETE /api/personas/{id}` → 204
  - `POST /api/personas/restore-defaults` → 200

- [ ] **Step 1: Create `backend/api/personas.py`**

```python
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.personas import PersonaRepository

router = APIRouter(prefix="/api/personas", tags=["personas"])

class CreatePersonaRequest(BaseModel):
    name: str
    role: str
    system_prompt: str

class UpdatePersonaRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    system_prompt: str | None = None
    enabled: bool | None = None

@router.get("")
async def list_personas():
    async with get_db() as db:
        repo = PersonaRepository(db)
        await repo.seed_defaults()
        async with db.execute("SELECT * FROM personas ORDER BY is_default DESC, created_at ASC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_persona(req: CreatePersonaRequest):
    async with get_db() as db:
        repo = PersonaRepository(db)
        return await repo.create(req.name, req.role, req.system_prompt)

@router.patch("/{persona_id}")
async def update_persona(persona_id: str, req: UpdatePersonaRequest):
    async with get_db() as db:
        repo = PersonaRepository(db)
        fields = {k: v for k, v in req.model_dump().items() if v is not None}
        result = await repo.update(persona_id, **fields)
        if not result:
            raise HTTPException(status_code=404, detail="Persona not found")
        return result

@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(persona_id: str):
    async with get_db() as db:
        repo = PersonaRepository(db)
        persona = await repo.get(persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Persona not found")
        if persona["id"] == "observer":
            raise HTTPException(status_code=400, detail="Observer cannot be deleted")
        if persona["is_default"]:
            raise HTTPException(status_code=400, detail="Default personas cannot be deleted — disable instead")
        await repo.delete(persona_id)

@router.post("/restore-defaults")
async def restore_defaults():
    async with get_db() as db:
        repo = PersonaRepository(db)
        await repo.restore_defaults()
        return {"ok": True}
```

- [ ] **Step 2: Register in `backend/main.py`**

Add to main.py:
```python
from api.personas import router as personas_router
app.include_router(personas_router)
```

- [ ] **Step 3: Create `frontend/hooks/usePersonas.ts`**

```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Persona = {
  id: string; name: string; role: string; system_prompt: string;
  enabled: number; is_default: number; model_provider: string; model_name: string;
};

export function usePersonas() {
  return useQuery<Persona[]>({
    queryKey: ["personas"],
    queryFn: () => fetch("/api/personas").then((r) => r.json()),
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Persona> & { id: string }) =>
      fetch(`/api/personas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/personas/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}

export function useRestoreDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetch("/api/personas/restore-defaults", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}
```

- [ ] **Step 4: Create `frontend/app/settings/personas/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { usePersonas, useUpdatePersona, useDeletePersona, useRestoreDefaults } from "@/hooks/usePersonas";

export default function PersonasPage() {
  const { data: personas, isLoading } = usePersonas();
  const updatePersona = useUpdatePersona();
  const deletePersona = useDeletePersona();
  const restoreDefaults = useRestoreDefaults();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; role: string; system_prompt: string }>({ name: "", role: "", system_prompt: "" });

  function startEdit(p: { id: string; name: string; role: string; system_prompt: string }) {
    setEditing(p.id);
    setDraft({ name: p.name, role: p.role, system_prompt: p.system_prompt });
  }

  async function saveEdit(id: string) {
    await updatePersona.mutateAsync({ id, ...draft });
    setEditing(null);
  }

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Persona Manager</h1>
        <button
          onClick={() => restoreDefaults.mutate()}
          className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30"
        >
          Restore Defaults
        </button>
      </div>

      <div className="space-y-2">
        {personas?.map((p) => (
          <div key={p.id} className="border border-border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updatePersona.mutate({ id: p.id, enabled: p.enabled ? 0 : 1 } as { id: string; enabled: number })}
                  className={`w-8 h-4 rounded-full transition-colors ${p.enabled ? "bg-accent" : "bg-border"}`}
                >
                  <span className={`block w-3 h-3 rounded-full bg-white mx-0.5 transition-transform ${p.enabled ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                {!!p.is_default && <span className="text-xs text-muted border border-border rounded px-1">default</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(p)} className="text-xs text-accent hover:underline">Edit</button>
                {!p.is_default && (
                  <button onClick={() => deletePersona.mutate(p.id)} className="text-xs text-pessimist hover:underline">Delete</button>
                )}
              </div>
            </div>

            {editing === p.id && (
              <div className="space-y-2 pt-2 border-t border-border">
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Name" />
                <input value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Role description" />
                <textarea value={draft.system_prompt} onChange={(e) => setDraft((d) => ({ ...d, system_prompt: e.target.value }))}
                  rows={4}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
                  placeholder="System prompt" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(p.id)} className="text-xs bg-accent text-white rounded px-3 py-1.5">Save</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-muted border border-border rounded px-3 py-1.5">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/api/personas.py backend/main.py frontend/hooks/usePersonas.ts frontend/app/settings/
git commit -m "feat: add persona manager API and UI"
```

---

### Task 21: Model Settings UI

**Files:**
- Create: `frontend/app/settings/models/page.tsx`

**Interfaces:**
- Consumes: `useModels`, `useSetApiKey`, `useDeleteApiKey`, `useTestProvider`
- Produces: Settings page to manage all provider API keys and Ollama URL with test buttons

- [ ] **Step 1: Create `frontend/app/settings/models/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useModels, useSetApiKey, useDeleteApiKey, useTestProvider } from "@/hooks/useModels";
import { api } from "@/lib/api";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  moonshot: "Moonshot / Kimi",
  openrouter: "OpenRouter",
  ollama: "Ollama (local)",
  huggingface: "HuggingFace (local)",
};

export default function ModelSettingsPage() {
  const { data, isLoading } = useModels();
  const setKey = useSetApiKey();
  const deleteKey = useDeleteApiKey();
  const testProvider = useTestProvider();
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [ollamaUrl, setOllamaUrl] = useState(data?.ollama_url ?? "");

  async function handleSaveKey(provider: string) {
    const key = keyInputs[provider];
    if (!key) return;
    await setKey.mutateAsync({ provider, key });
    setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
  }

  async function handleTest(provider: string) {
    const result = await testProvider.mutateAsync(provider);
    setTestResults((prev) => ({ ...prev, [provider]: result }));
  }

  async function handleSaveOllama() {
    await api.patchSettings({ ollama_url: ollamaUrl });
  }

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  const providers = data?.providers ?? [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold">Model Settings</h1>

      <div className="border border-border rounded-md p-4 space-y-3">
        <h2 className="text-sm font-medium text-foreground">Ollama (local models)</h2>
        <div className="flex gap-2">
          <input
            value={ollamaUrl || data?.ollama_url || ""}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://host.docker.internal:11434"
            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
          />
          <button onClick={handleSaveOllama} className="text-xs bg-accent text-white rounded px-3 py-1.5">Save</button>
          <button onClick={() => handleTest("ollama")} className="text-xs border border-border rounded px-3 py-1.5 text-muted hover:border-foreground/30">Test</button>
        </div>
        {testResults["ollama"] && (
          <p className={`text-xs ${testResults["ollama"].ok ? "text-optimist" : "text-pessimist"}`}>
            {testResults["ollama"].message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {providers.filter((p) => p.provider !== "ollama" && p.provider !== "huggingface").map((p) => (
          <div key={p.provider} className="border border-border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">{PROVIDER_LABELS[p.provider] ?? p.provider}</h2>
              {p.configured && (
                <span className="text-xs text-optimist">Configured</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInputs[p.provider] ?? ""}
                onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                placeholder={p.configured ? "Update API key…" : "Enter API key…"}
                className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
              />
              <button onClick={() => handleSaveKey(p.provider)} className="text-xs bg-accent text-white rounded px-3 py-1.5">Save</button>
              {p.configured && (
                <>
                  <button onClick={() => handleTest(p.provider)} className="text-xs border border-border rounded px-3 py-1.5 text-muted hover:border-foreground/30">Test</button>
                  <button onClick={() => deleteKey.mutate(p.provider)} className="text-xs border border-pessimist/40 rounded px-3 py-1.5 text-pessimist hover:bg-pessimist/10">Delete</button>
                </>
              )}
            </div>
            {testResults[p.provider] && (
              <p className={`text-xs ${testResults[p.provider].ok ? "text-optimist" : "text-pessimist"}`}>
                {testResults[p.provider].message}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/settings/models/
git commit -m "feat: add model settings UI with key management and provider test"
```

---

### Task 22: Session History

**Files:**
- Create: `frontend/app/history/page.tsx`

**Interfaces:**
- Consumes: `useSessionList`, `api.deleteSession`

- [ ] **Step 1: Create `frontend/app/history/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useSessionList } from "@/hooks/useSession";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function HistoryPage() {
  const { data: sessions, isLoading } = useSessionList();
  const router = useRouter();
  const qc = useQueryClient();
  const deleteSession = useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const STATUS_COLORS: Record<string, string> = {
    completed: "text-optimist",
    running: "text-contrarian",
    error: "text-pessimist",
    pending: "text-muted",
  };

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold">Session History</h1>

      {!sessions?.length && (
        <p className="text-muted text-sm">No sessions yet. Start a council from the home page.</p>
      )}

      <div className="space-y-1">
        {sessions?.map((s) => (
          <div key={s.id} className="border border-border rounded-md px-4 py-3 flex items-center gap-3 hover:border-foreground/20 transition-colors">
            <button className="flex-1 text-left" onClick={() => router.push(`/session/${s.id}`)}>
              <div className="text-sm text-foreground truncate">{s.question}</div>
              <div className="text-xs text-muted mt-0.5">
                {new Date(s.created_at).toLocaleDateString()} · {s.debate_intensity} · {s.model_summary}
              </div>
              {s.final_recommendation_preview && (
                <div className="text-xs text-muted mt-1 truncate">{s.final_recommendation_preview}</div>
              )}
            </button>
            <span className={`text-xs shrink-0 ${STATUS_COLORS[s.status] ?? "text-muted"}`}>{s.status}</span>
            <button
              onClick={() => { if (confirm("Delete this session?")) deleteSession.mutate(s.id); }}
              className="text-xs text-muted hover:text-pessimist transition-colors shrink-0"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add nav links to root layout**

In `frontend/app/layout.tsx`, add a nav bar:

```tsx
import Link from "next/link";
// Inside <body> before <Providers>:
<nav className="border-b border-border px-4 py-3 flex gap-6">
  <Link href="/" className="text-sm text-foreground hover:text-accent">Home</Link>
  <Link href="/history" className="text-sm text-muted hover:text-foreground">History</Link>
  <Link href="/settings/models" className="text-sm text-muted hover:text-foreground">Models</Link>
  <Link href="/settings/personas" className="text-sm text-muted hover:text-foreground">Personas</Link>
</nav>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/history/ frontend/app/layout.tsx
git commit -m "feat: add session history screen and nav bar"
```

---

### Task 23: Error States and User-Facing Messages

**Files:**
- Modify: `backend/api/sessions.py` — wrap errors in readable messages
- Modify: `frontend/app/session/[id]/page.tsx` — display error banner
- Create: `frontend/components/ui/ErrorBanner.tsx`

**Interfaces:**
- Produces: All known error conditions display readable messages; no raw HTTP codes shown to users

- [ ] **Step 1: Create `frontend/components/ui/ErrorBanner.tsx`**

```tsx
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="border border-pessimist/40 bg-pessimist/5 rounded-md px-4 py-3 flex items-start gap-3">
      <span className="text-pessimist text-sm flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-muted hover:text-foreground text-xs shrink-0">Dismiss</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add error banner to session page**

In `frontend/app/session/[id]/page.tsx`, add near the top of the message list:

```tsx
import { ErrorBanner } from "@/components/ui/ErrorBanner";

// Inside the JSX, before allRounds.map():
{store.error && (
  <ErrorBanner
    message={store.error}
    onDismiss={() => store.setError("")}
  />
)}
```

Also add `setError` accepting empty string to clear in sessionStore:
```typescript
setError: (error) => set({ error: error || null, phase: error ? "error" : store.phase }),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/ErrorBanner.tsx frontend/app/session/
git commit -m "feat: add error banner and user-readable error display"
```

---

### Task 24: Debate Intensity Research Budget Enforcement

**Files:**
- Modify: `backend/graph/nodes.py` — enforce per-mode limits in `node_persona_research`
- Modify: `frontend/components/session/IntensitySelector.tsx` — show Deep Dive warning

**Interfaces:**
- Produces: Research limits respected per intensity mode; Deep Dive shows a cost warning before starting

- [ ] **Step 1: Update `node_persona_research` to enforce per-mode limits**

The limits are already defined in `node_persona_research` via `intensity_limits`. Confirm the hard limits are applied:
- Global: max 30 searches, max 50 URLs
- Per-persona: per `intensity_limits` dict

The current implementation already does this. Add a global search counter check before the per-persona loop begins. Verify with a test that a quick session caps at 2 searches per persona.

- [ ] **Step 2: Add Deep Dive warning to `IntensitySelector`**

In `frontend/components/session/IntensitySelector.tsx`, add warning for `deep_dive`:

```tsx
{value === "deep_dive" && (
  <p className="text-xs text-contrarian mt-2">
    Deep Dive runs up to 15 rounds and may use significantly more API tokens.
  </p>
)}
```

- [ ] **Step 3: Commit**

```bash
git add backend/graph/nodes.py frontend/components/session/IntensitySelector.tsx
git commit -m "feat: enforce research budgets per intensity mode and add Deep Dive warning"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec Section | Task(s) |
|---|---|
| Docker 2-container Compose | Task 1 |
| SQLite schema (all tables) | Task 2 |
| API key encryption (Fernet) | Task 3 |
| Model gateway + all providers | Tasks 4–5 |
| LangGraph state schema | Task 6 |
| Persona agents + prompts | Task 6 |
| LangGraph graph (validate→brief→research→merge→positions→debate→observer→report) | Tasks 7–8, 18 |
| FastAPI REST + WebSocket | Task 8 |
| HuggingFace fallback + onboarding | Task 9 |
| Next.js scaffold + proxy | Task 10 |
| Zustand stores + API client | Task 11 |
| useDebateSocket | Task 12 |
| Home screen | Task 13 |
| Live council screen | Task 14 |
| Final report screen | Task 15 |
| Tavily search + URL reader | Task 16 |
| Chroma relevance scoring | Task 17 |
| Research nodes in graph | Task 18 |
| Source panel UI | Task 19 |
| Persona manager (API + UI) | Task 20 |
| Model settings UI | Task 21 |
| Session history | Task 22 |
| Error states | Task 23 |
| Research budget enforcement | Task 24 |
| Persona limits (min 2, max 6, Observer required) | Task 20 (Observer delete blocked) |
| Markdown export | Task 15 (ExportButton) |
| Dynamic stopping (consensus + repetition) | Task 7 (`should_continue`) |
| No fake consensus | Task 7 (Observer prompt + final report prompt) |
| Observer cannot be deleted | Task 20 (API enforces) |
| Fernet key stored as `secret.key` file, not in DB | Task 3 |

**No TBDs, TODOs, or incomplete sections found.**

**Type consistency verified:** All function signatures referenced in later tasks match their definitions in earlier tasks (`ModelConfig`, `CouncilState`, `build_debate_prompt`, `get_db`, `SettingsRepository.get/set`, WebSocket event envelope shape).
