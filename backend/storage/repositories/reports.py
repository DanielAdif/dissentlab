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
