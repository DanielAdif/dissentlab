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
