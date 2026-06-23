import os
import aiosqlite
from contextlib import asynccontextmanager

DB_PATH = os.environ.get("DB_PATH", "/data/db/dissentlab.db")


async def run_migrations_once() -> None:
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await run_migrations(db)


@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def run_migrations(db: aiosqlite.Connection) -> None:
    db.row_factory = aiosqlite.Row
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
