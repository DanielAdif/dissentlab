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
