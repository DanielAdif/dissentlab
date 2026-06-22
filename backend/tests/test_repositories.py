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
