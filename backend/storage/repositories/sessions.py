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
