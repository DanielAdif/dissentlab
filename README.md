# DissentLab

A local-first AI debate engine. Ask a question and watch four AI personas — Optimist, Pessimist, Contrarian, and Observer — argue it out across multiple rounds before the Observer synthesises a final recommendation.

The entire stack runs in Docker. No data leaves your machine unless you configure a cloud model provider.

---

## How it works

1. You submit a question and pick a debate intensity (Quick / Standard / Deep Dive).
2. Optionally, Tavily searches the web for evidence first.
3. Each persona forms an initial position, then challenges the others over N rounds.
4. The Observer checks for consensus after every round and can call the debate early.
5. The final report is written by the Observer and can be exported as Markdown.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|-----------------|-------|
| Docker Desktop | 24+ | With Compose V2 |
| Git | any | |

That is all you need for the Docker path. For local development without Docker see [Running without Docker](#running-without-docker).

---

## Quick start (Docker)

```bash
git clone <repo-url>
cd dissentlab
docker compose up --build
```

Open **http://localhost:3000** in your browser.

The first build downloads Python and Node images plus all dependencies — expect 5–10 minutes. Subsequent starts are fast.

> The backend runs internally only. Only port `3000` (frontend) is exposed to your host.

---

## Model providers

DissentLab supports six providers. You can mix and match — each persona can use a different model.

| Provider | Needs API key | Notes |
|----------|--------------|-------|
| OpenAI | Yes | GPT-4o, GPT-4 Turbo, etc. |
| Anthropic | Yes | Claude 3.x family |
| Google Gemini | Yes | Gemini 1.5 Pro / Flash |
| Moonshot | Yes | Kimi models |
| OpenRouter | Yes | Routes to 100+ models |
| Ollama | No | Local models, no internet needed |
| HuggingFace (fallback) | No | Qwen3-0.6B, runs on CPU, auto-downloaded |

### Adding an API key

1. Go to **Settings → Models** in the UI.
2. Paste the key for each provider you want to use.
3. Hit **Save**, then **Test** to verify the connection.

Keys are encrypted with Fernet before being written to the SQLite database. They never touch a `.env` file or Docker environment variables.

### Using Ollama (fully local, no API key)

1. Install [Ollama](https://ollama.com) on your host machine and pull a model:
   ```bash
   ollama pull llama3
   ```
2. Start the stack. The backend reaches Ollama via `host.docker.internal:11434` by default.
3. In **Settings → Models**, set the Ollama URL if yours differs, then select a model in the debate form.

To override the Ollama URL at stack level:

```bash
OLLAMA_URL=http://192.168.1.10:11434 docker compose up
```

### Using the HuggingFace fallback (offline, CPU)

Select **HuggingFace** as the provider on the home screen. If the model is not yet downloaded you will see a progress bar; the download happens inside the container and is cached in the `dissentlab_models` volume.

---

## Web search (Tavily)

For Standard and Deep Dive intensities, DissentLab can search the web before the debate starts. This requires a free [Tavily](https://tavily.com) API key.

1. Add the key in **Settings → Models → Tavily**.
2. Quick debates always skip research. Standard runs up to 4 searches per persona; Deep Dive runs up to 8.

Leave the key blank to skip research entirely — the debate still works fine without it.

---

## Debate intensity

| Mode | Research | Debate rounds | Estimated time |
|------|----------|---------------|---------------|
| Quick | Skipped | 1 | ~30 s |
| Standard | ✓ (4 searches/persona) | Up to 5 | 2–5 min |
| Deep Dive | ✓ (8 searches/persona) | Up to 15 | 10–20 min |

Deep Dive uses significantly more API tokens. A warning is shown in the UI when you select it.

---

## Changing the frontend port

```bash
FRONTEND_PORT=8080 docker compose up
```

---

## Persistent data

All data is stored in named Docker volumes:

| Volume | Contents |
|--------|----------|
| `dissentlab_db` | SQLite database (sessions, personas, settings) |
| `dissentlab_chroma` | ChromaDB vector store (research embeddings) |
| `dissentlab_models` | Downloaded HuggingFace model weights |
| `dissentlab_cache` | URL content cache |

To wipe everything and start fresh:

```bash
docker compose down -v
```

To back up the database:

```bash
docker run --rm -v dissentlab_db:/data -v $(pwd):/out alpine \
  cp /data/dissentlab.db /out/dissentlab-backup.db
```

---

## Custom personas

The four default personas (Optimist, Pessimist, Contrarian, Observer) can be customised or replaced.

1. Go to **Settings → Personas**.
2. Edit the system prompt, name, or role of any persona.
3. Add entirely new personas for specialised debates (e.g. a Devil's Advocate or a Domain Expert).
4. Use **Restore Defaults** to revert to the originals.

Default personas cannot be deleted, only disabled or edited.

---

## Running without Docker

### Backend (Python 3.12+)

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Start the API server
uvicorn main:app --reload --port 8000
```

The server listens on `http://localhost:8000`. Data is written to `/data/db/` by default; override with:

```bash
DB_PATH=./local.db uvicorn main:app --reload --port 8000
```

Other env vars you may want to set locally:

```bash
DB_PATH=./data/dissentlab.db
CHROMA_PATH=./data/chroma
MODELS_PATH=./data/models
CACHE_PATH=./data/cache
OLLAMA_URL=http://localhost:11434
```

### Frontend (Node 22+)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The Next.js dev server proxies `/api/*` to `http://localhost:8000` automatically.

---

## Running tests

### Backend

```bash
cd backend
python -m pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm test
```

---

## Development mode (hot reload, Docker)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Source files are volume-mounted so changes take effect immediately — no rebuild needed.

---

## Project structure

```
dissentlab/
├── backend/
│   ├── api/          # FastAPI routers (sessions, models, personas, settings, ws)
│   ├── agents/       # Persona agent classes
│   ├── graph/        # LangGraph state, nodes, graph builder
│   ├── models/       # ModelGateway + provider implementations
│   ├── research/     # Evidence merger + ChromaDB integration
│   ├── security/     # Fernet encryption helpers
│   ├── storage/      # aiosqlite DB, repositories
│   ├── tools/        # Tavily search, URL reader, summariser
│   └── main.py       # FastAPI app entry point
├── frontend/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components (debate, report, session, ui)
│   ├── hooks/        # useDebateSocket, useSession, useModels
│   ├── lib/          # API client, utilities
│   └── stores/       # Zustand state (session, settings)
├── docker-compose.yml
├── docker-compose.dev.yml
└── docs/
```

---

## Troubleshooting

**The frontend loads but API calls fail**

Make sure the backend container is running: `docker compose ps`. Check backend logs: `docker compose logs backend`.

**Ollama models are not found**

Ollama must be running on your host before starting the stack. Confirm with `ollama list`. If you're on Linux, `host.docker.internal` may not resolve — set `OLLAMA_URL=http://172.17.0.1:11434` (the Docker bridge gateway IP).

**HuggingFace download hangs**

The Qwen3-0.6B download is ~600 MB. If it stalls, check your internet connection and retry. The download resumes from the volume cache on the next attempt.

**Database errors on startup**

If you see SQLite errors, the volume may be from an incompatible version. Run `docker compose down -v` to wipe volumes and restart.
